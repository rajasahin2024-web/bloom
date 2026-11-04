"""Mail router — public username check + admin mailbox mirror (TEC-184).

`GET /api/mailboxes/availability` drives the debounced username picker on
`/login?mode=signup`. It's public (the signup page is unauthenticated) so it
is rate-limited per caller IP — the check is advisory: naming rules and the
`mailboxes` mirror answer locally, the provider's `check_username` is the
last hop, and an unreachable provider yields `available: null` rather than a
hard failure (signup never blocks on mail availability, arch §11).

`mail_admin` (`/api/admin/mailboxes*`) surfaces provisioning status to admins
plus a retry action for `failed`/`pending` rows — the operator escape hatch
the contract's retry semantics assume exists.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import hash_password
from app.deps import require_admin
from app.integrations.mail_api import MailProvisioner, get_mail_provisioner
from app.models.enums import MailboxStatus
from app.models.mailbox import Mailbox
from app.models.user import User
from app.schemas.common import Page, Pagination
from app.schemas.mail import AvailabilityOut, MailboxOut, MailboxRetryIn
from app.services import mail as mail_service
from app.services import mail_jobs, rate_limit

router = APIRouter(tags=["mail"])
admin_router = APIRouter(prefix="/api/admin/mailboxes", tags=["mail_admin"])


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
    return AvailabilityOut(
        localpart=localpart.strip().lower(), available=available, reason=reason
    )


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
