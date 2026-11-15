"""Mail router — public username check + admin mailbox mirror (TEC-184).

`GET /api/mailboxes/availability` drives the debounced username picker on
`/login?mode=signup`. It's public (the signup page is unauthenticated) so it
is rate-limited per caller IP — the check is advisory: naming rules and the
`mailboxes` mirror answer locally, the provider's `check_username` is the
last hop, and an unreachable provider yields `available: null` rather than a
hard failure (signup never blocks on mail availability, arch §11).

`mail_admin` (`/api/admin/mailboxes*`) surfaces provisioning status to admins
plus a retry action for `failed`/`pending` rows — the operator escape hatch
the contract's retry semantics assume exists. TEC-188 extends it with the
mailbox actions (create/suspend/unsuspend/reset-password/test) and the
`engine_router` (`/api/admin/mail/*`) diagnostics surface — both per
`contracts/mail-admin.yaml`.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import hash_password
from app.deps import require_admin
from app.integrations import mail_api
from app.integrations.mail_api import (
    MailEngineInspector,
    MailProvisioner,
    get_mail_inspector,
    get_mail_provisioner,
)
from app.models.enums import MailboxStatus
from app.models.mailbox import Mailbox
from app.models.user import User
from app.schemas.common import Page, Pagination
from app.schemas.mail import (
    AvailabilityOut,
    DeliveryReportOut,
    DnsReportOut,
    EngineStatusOut,
    ListenerOut,
    MailboxCreateIn,
    MailboxOut,
    MailboxRetryIn,
    MailboxStatusOut,
    MailboxTestIn,
    MailboxTestOut,
    QueueCountsOut,
    QueueItemOut,
    QueueReportOut,
    QueueRetryIn,
    QueueRetryOut,
    ResetPasswordOut,
    TestSendIn,
    TestSendOut,
    TlsOut,
    delivery_item_from_adapter,
)
from app.services import mail as mail_service
from app.services import mail_admin, mail_jobs, rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(tags=["mail"])
admin_router = APIRouter(prefix="/api/admin/mailboxes", tags=["mail_admin"])
engine_router = APIRouter(prefix="/api/admin/mail", tags=["mail_admin"])


def _mail_http_error(exc: mail_api.MailError) -> HTTPException:
    """Taxonomy → HTTP (contract §Errors). Provider detail stays in logs —
    admins get the taxonomy code, not the upstream message."""
    http_status = {
        "invalid_request": status.HTTP_400_BAD_REQUEST,
        "invalid_localpart": status.HTTP_422_UNPROCESSABLE_CONTENT,
        "conflict": status.HTTP_409_CONFLICT,
        "not_found": status.HTTP_404_NOT_FOUND,
    }.get(exc.code, status.HTTP_502_BAD_GATEWAY)
    logger.warning("mail engine call failed (%s): %s", exc.code, exc)
    return HTTPException(status_code=http_status, detail=f"mail engine: {exc.code}")


def _enforce_probe_rate_limit(redis: Redis, admin_id: uuid.UUID) -> None:
    """Shared per-admin bucket for /{id}/test + /test-send (~10/min)."""
    settings = get_settings()
    try:
        ok = rate_limit.hit(
            redis,
            "mail:probe:admin",
            str(admin_id),
            settings.mail_admin_probe_limit,
            settings.mail_admin_probe_window_seconds,
        )
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Probe rate limiting is temporarily unavailable",
        ) from None
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many probe requests — please try again later.",
            headers={"Retry-After": str(settings.mail_admin_probe_window_seconds)},
        )


def _enforce_check_rate_limit(redis: Redis, client_ip: str | None) -> None:
    """Fixed-window per-IP throttle for the availability typeahead.

    Same fail-closed posture as login: an enumeration control that disables
    itself during a Redis outage is worse than a degraded typeahead.
    """
    settings = get_settings()
    try:
        ok = rate_limit.hit(
            redis,
            "mail:avail:ip",
            client_ip or "unknown",
            settings.mail_username_check_limit,
            settings.mail_username_check_window_seconds,
        )
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Username check is temporarily unavailable",
        ) from None
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests — please try again later.",
            headers={"Retry-After": str(settings.mail_username_check_window_seconds)},
        )


@router.get("/api/mailboxes/availability", response_model=AvailabilityOut)
def username_availability(
    request: Request,
    localpart: str = Query(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    provisioner: MailProvisioner = Depends(get_mail_provisioner),
) -> AvailabilityOut:
    _enforce_check_rate_limit(redis, request.client.host if request.client else None)
    available, reason = mail_service.username_available(db, provisioner, localpart)
    return AvailabilityOut(localpart=localpart.strip().lower(), available=available, reason=reason)


def _mailbox_out(row: Mailbox) -> MailboxOut:
    """Serialize a mirror row; `address` is derived (localpart@MAIL_DOMAIN)."""
    return MailboxOut.model_validate(
        {
            **{c.name: getattr(row, c.name) for c in Mailbox.__table__.columns},
            "address": f"{row.localpart}@{get_settings().mail_domain}",
        }
    )


@admin_router.get("", response_model=Page[MailboxOut])
def list_mailboxes(
    pagination: Pagination = Depends(),
    status_filter: MailboxStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[MailboxOut]:
    """Paginated mirror-table listing — the admin provisioning-status view."""
    query = select(Mailbox)
    if status_filter is not None:
        query = query.where(Mailbox.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Mailbox.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[_mailbox_out(m) for m in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@admin_router.get("/{mailbox_id}", response_model=MailboxOut)
def get_mailbox(
    mailbox_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MailboxOut:
    row = db.get(Mailbox, mailbox_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mailbox not found")
    return _mailbox_out(row)


@admin_router.post("/{mailbox_id}/retry", response_model=MailboxOut)
def retry_mailbox(
    mailbox_id: uuid.UUID,
    payload: MailboxRetryIn | None = None,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    _: User = Depends(require_admin),
) -> MailboxOut:
    """Re-enqueue provisioning for a `failed` or `pending` row.

    Resets the attempt counter — an admin retry is a fresh decision, not a
    continuation of the exhausted backoff sequence.

    `mail_secret` is purged when a row goes `failed` (TEC-187), so retrying a
    failed row requires fresh credentials: pass `mail_password` in the body
    and it is re-hashed (argon2id) and stored until the next terminal outcome.
    """
    row = db.get(Mailbox, mailbox_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mailbox not found")
    if row.status not in (MailboxStatus.failed, MailboxStatus.pending):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mailbox is {row.status} — retry applies to failed or pending rows",
        )
    if payload is not None and payload.mail_password is not None:
        row.mail_secret = hash_password(payload.mail_password)
    if row.mail_secret is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No provisioning secret on record — supply mail_password to set a fresh one",
        )
    row.status = MailboxStatus.pending
    row.attempts = 0
    row.last_error = None
    if mail_jobs.enqueue_create(redis, row.id):
        row.status = MailboxStatus.queued
    db.commit()
    db.refresh(row)
    return _mailbox_out(row)


# ── Mailbox actions (TEC-188) ──────────────────────────────────────────────────


def _get_mailbox_or_404(db: Session, mailbox_id: uuid.UUID) -> Mailbox:
    row = db.get(Mailbox, mailbox_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mailbox not found")
    return row


@admin_router.post("", response_model=MailboxOut, status_code=status.HTTP_201_CREATED)
def create_mailbox(
    payload: MailboxCreateIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    provisioner: MailProvisioner = Depends(get_mail_provisioner),
) -> MailboxOut:
    """Provision a standalone mailbox — synchronous (contract 201|409|400).

    `user_id` stays NULL: admin-created boxes (service/staff) have no owning
    platform account. The password goes to the engine pre-hashed and is never
    stored — provisioning completes in-request, so no `mail_secret` is needed.
    """
    localpart = mail_api.normalize_localpart(payload.localpart)
    if error := mail_api.localpart_error(localpart):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"localpart is {error}",
        )
    claimed = db.scalar(select(Mailbox.id).where(Mailbox.localpart == localpart))
    if claimed is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="localpart already claimed",
        )
    try:
        if not provisioner.check_username(localpart):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="localpart already claimed on the engine",
            )
        quota_mb = payload.quota_mb or get_settings().mail_default_quota_mb
        provisioner.create_mailbox(localpart, hash_password(payload.password), quota_mb)
    except HTTPException:
        raise
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    row = Mailbox(
        user_id=None,
        localpart=localpart,
        status=MailboxStatus.active,
        quota_mb=quota_mb,
        provisioned_at=datetime.now(UTC),
    )
    db.add(row)
    mail_admin.write_audit(
        db,
        admin,
        "mailbox.create",
        localpart,
        {"quota_mb": quota_mb, "result": "created"},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # localpart claimed by a racing request
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="localpart already claimed",
        ) from None
    db.refresh(row)
    return _mailbox_out(row)


@admin_router.post("/{mailbox_id}/suspend", response_model=MailboxStatusOut)
def suspend_mailbox(
    mailbox_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    provisioner: MailProvisioner = Depends(get_mail_provisioner),
) -> MailboxStatusOut:
    row = _get_mailbox_or_404(db, mailbox_id)
    try:
        provisioner.suspend(row.localpart)
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    row.status = MailboxStatus.suspended
    mail_admin.write_audit(db, admin, "mailbox.suspend", str(row.id), {"localpart": row.localpart})
    db.commit()
    return MailboxStatusOut(status="suspended")


@admin_router.post("/{mailbox_id}/unsuspend", response_model=MailboxStatusOut)
def unsuspend_mailbox(
    mailbox_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    provisioner: MailProvisioner = Depends(get_mail_provisioner),
) -> MailboxStatusOut:
    row = _get_mailbox_or_404(db, mailbox_id)
    try:
        provisioner.unsuspend(row.localpart)
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    row.status = MailboxStatus.active
    mail_admin.write_audit(
        db, admin, "mailbox.unsuspend", str(row.id), {"localpart": row.localpart}
    )
    db.commit()
    return MailboxStatusOut(status="active")


@admin_router.post("/{mailbox_id}/reset-password", response_model=ResetPasswordOut)
def reset_mailbox_password(
    mailbox_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    provisioner: MailProvisioner = Depends(get_mail_provisioner),
) -> ResetPasswordOut:
    row = _get_mailbox_or_404(db, mailbox_id)
    new_password = mail_admin.generate_password()
    try:
        provisioner.reset_password(row.localpart, hash_password(new_password))
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    row.mail_secret = None  # any queued hash is stale post-reset
    mail_admin.write_audit(
        db,
        admin,
        "mailbox.reset_password",
        str(row.id),
        {"localpart": row.localpart},
    )
    db.commit()
    return ResetPasswordOut(password=new_password)


@admin_router.post("/{mailbox_id}/test", response_model=MailboxTestOut)
def test_mailbox(
    mailbox_id: uuid.UUID,
    payload: MailboxTestIn,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    admin: User = Depends(require_admin),
) -> MailboxTestOut:
    """SMTP AUTH + IMAP LOGIN probe. The password is transient — request
    body only; the audit row carries booleans, never the credential."""
    row = _get_mailbox_or_404(db, mailbox_id)
    _enforce_probe_rate_limit(redis, admin.id)
    settings = get_settings()
    address = f"{row.localpart}@{settings.mail_domain}"
    smtp_ok, smtp_err = mail_admin.smtp_auth_probe(
        settings.mail_service_host,
        address,
        payload.password,
        settings.mail_probe_timeout_seconds,
    )
    imap_ok, imap_err = mail_admin.imap_login_probe(
        settings.mail_service_host,
        address,
        payload.password,
        settings.mail_probe_timeout_seconds,
    )
    error = "; ".join(e for e in (smtp_err, imap_err) if e) or None
    mail_admin.write_audit(
        db,
        admin,
        "mailbox.test",
        str(row.id),
        {"localpart": row.localpart, "smtpAuth": smtp_ok, "imap": imap_ok},
    )
    db.commit()
    return MailboxTestOut(smtp_auth=smtp_ok, imap=imap_ok, error=error)


# ── Engine surface /api/admin/mail/* (TEC-188) ─────────────────────────────────


@engine_router.get("/status", response_model=EngineStatusOut)
def mail_engine_status(
    _: User = Depends(require_admin),
    inspector: MailEngineInspector = Depends(get_mail_inspector),
) -> EngineStatusOut:
    """Health snapshot — never raises on engine problems; flags carry state."""
    settings = get_settings()
    timeout = settings.mail_probe_timeout_seconds
    host = settings.mail_service_host
    reachable = inspector.ping()
    listeners = [
        ListenerOut(name=name, port=port, ok=mail_admin.tcp_probe(host, port, timeout))
        for name, port in mail_admin.LISTENERS
    ]
    cert = mail_admin.tls_cert_info(host, mail_admin.IMAPS_PORT, timeout)
    queue = None
    try:
        snap = inspector.queue_snapshot()
        if snap is not None:
            queue = QueueCountsOut(active=snap.active, deferred=snap.deferred)
    except mail_api.MailError:
        logger.info("mail status: queue snapshot unavailable")
    return EngineStatusOut(
        checked_at=datetime.now(UTC),
        api_reachable=reachable,
        listeners=listeners,
        tls=TlsOut(**cert) if cert else None,
        queue=queue,
    )


@engine_router.get("/dns", response_model=DnsReportOut)
def mail_dns_check(
    _: User = Depends(require_admin),
    inspector: MailEngineInspector = Depends(get_mail_inspector),
) -> DnsReportOut:
    settings = get_settings()
    with httpx.Client(timeout=settings.mail_probe_timeout_seconds) as client:
        report = mail_admin.run_dns_check(client, inspector)
    return DnsReportOut(**report)


@engine_router.post("/test-send", response_model=TestSendOut)
def mail_test_send(
    payload: TestSendIn,
    response: Response,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    admin: User = Depends(require_admin),
) -> TestSendOut:
    """Send a real test mail via the service account (TEC-190 provisions
    MAIL_TEST_* — `unavailable` until the env lands)."""
    _enforce_probe_rate_limit(redis, admin.id)
    settings = get_settings()
    if not settings.mail_test_address or not settings.mail_test_secret:
        mail_admin.write_audit(
            db,
            admin,
            "engine.test_send",
            payload.to,
            {"accepted": False, "reason": "unconfigured"},
        )
        db.commit()
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return TestSendOut(accepted=False, message_id=None, error="unavailable")
    try:
        message_id = mail_admin.send_test_message(
            settings.mail_service_host,
            settings.mail_test_address,
            settings.mail_test_secret,
            payload.to,
            settings.mail_probe_timeout_seconds,
        )
        result = TestSendOut(accepted=True, message_id=message_id, error=None)
    except Exception as exc:  # noqa: BLE001 — probe failures are the payload
        logger.info("mail test-send failed: %s", exc)
        result = TestSendOut(accepted=False, message_id=None, error=str(exc))
    mail_admin.write_audit(
        db,
        admin,
        "engine.test_send",
        payload.to,
        {"accepted": result.accepted},
    )
    db.commit()
    return result


@engine_router.get("/queue", response_model=QueueReportOut)
def mail_queue_list(
    _: User = Depends(require_admin),
    inspector: MailEngineInspector = Depends(get_mail_inspector),
) -> QueueReportOut:
    try:
        snap = inspector.queue_snapshot()
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    if snap is None:
        return QueueReportOut(available=False, items=[], total=0)
    return QueueReportOut(
        available=True,
        items=[
            QueueItemOut(
                id=m.id,
                return_path=m.return_path,
                size=m.size,
                created=m.created,
                status=m.status,
                next_retry=m.next_retry,
                recipients=m.recipients,
            )
            for m in snap.items
        ],
        total=snap.total,
    )


@engine_router.post("/queue/retry", response_model=QueueRetryOut)
def mail_queue_retry(
    payload: QueueRetryIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    inspector: MailEngineInspector = Depends(get_mail_inspector),
) -> QueueRetryOut:
    try:
        snap = inspector.queue_snapshot()  # exposure probe + count for "all"
        if snap is None:
            return QueueRetryOut(available=False, retried=0, error="queue endpoint not exposed")
        if payload.all:
            ok = inspector.queue_retry_all()
            retried = snap.deferred + snap.active if ok else 0
            failed: list[str] = []
        else:
            retried = 0
            failed = []
            for message_id in payload.ids or []:
                if inspector.queue_retry_one(message_id):
                    retried += 1
                else:
                    failed.append(message_id)
            ok = retried > 0
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    error = None
    if failed:
        error = f"{len(failed)} message(s) not found or refused"
    elif not ok:
        error = "engine refused the reschedule"
    mail_admin.write_audit(
        db,
        admin,
        "queue.retry",
        "engine",
        {
            "scope": "all" if payload.all else f"{len(payload.ids or [])} ids",
            "retried": retried,
            "failed": len(failed),
        },
    )
    db.commit()
    return QueueRetryOut(available=True, retried=retried, error=error)


@engine_router.get("/delivery", response_model=DeliveryReportOut)
def mail_delivery_inspector(
    account: str | None = Query(default=None, max_length=320),
    limit: int = Query(default=25, ge=1, le=100),
    _: User = Depends(require_admin),
    inspector: MailEngineInspector = Depends(get_mail_inspector),
) -> DeliveryReportOut:
    """Metadata-only inspector — per-account via JMAP (OSS-safe), engine-wide
    via traces (Enterprise-gated → `available:false` on OSS)."""
    try:
        items = inspector.delivery_items(account.strip().lower() if account else None, limit)
    except mail_api.MailError as exc:
        raise _mail_http_error(exc) from exc
    if items is None:
        return DeliveryReportOut(available=False, items=[])
    return DeliveryReportOut(
        available=True,
        items=[delivery_item_from_adapter(i) for i in items],
    )
