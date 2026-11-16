"""Tests for TEC-188 — mail admin surface (contracts/mail-admin.yaml).

Coverage:

- adapter extensions (FakeTransport): ping, queue snapshot/retry,
  dns_records, traces + JMAP delivery paths
- service helpers: password gen, audit guard, DNS evaluation matrix,
  DER cert notAfter parse
- router (bloom_test + Redis db-1): mailbox create/suspend/unsuspend/
  reset-password/test, engine status/dns/queue/test-send/delivery,
  audit rows, rate limits, admin gating

Infra tests run against bloom_test only (never bloom — TEC-179).
"""

from __future__ import annotations

import uuid
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.redis import get_redis
from app.core.security import create_access_token
from app.integrations import mail_api
from app.main import app
from app.models.enums import MailboxStatus, UserRole
from app.models.mail_audit import MailAdminAudit
from app.models.mailbox import Mailbox  # noqa: F401  (used via _make_mailbox)
from app.models.user import User
from app.services import mail_admin
from app.tests.test_mail import (
    FakeTransport,
    _account,
    _admin_headers,
    _delete_user,
    _fresh,
    _jmap_resp,
    _make_mailbox,
    _provisioner,
    _push_domain,
    _push_lookup,
    requires_infra,
)

PG_DSN = "postgresql://bloom:bloom_dev_password@localhost:5433/bloom_test"
REDIS_TEST_URL = "redis://localhost:6380/1"


@pytest.fixture
def db() -> Generator[Session, None, None]:
    engine = create_engine(PG_DSN.replace("postgresql://", "postgresql+psycopg://"))
    factory = sessionmaker(bind=engine, future=True)
    session = factory()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def redis_db1() -> Generator[Redis, None, None]:
    r = Redis.from_url(REDIS_TEST_URL, decode_responses=True)
    r.flushdb()
    yield r
    r.flushdb()


# ── Adapter extension unit tests (no infra) ────────────────────────────────────


def test_ping_reachability() -> None:
    p = _provisioner(FakeTransport().push(200, {"accounts": {"b": {}}}))
    assert p.ping() is True
    # Engine answering 401 still counts as reachable — the API responded.
    p = _provisioner(FakeTransport().push(401, {"detail": "nope"}))
    assert p.ping() is True


def test_ping_unreachable() -> None:
    t = FakeTransport()
    t.raise_error = mail_api.MailUnavailableError("down")
    p = _provisioner(t)
    assert p.ping() is False
    assert t.calls[0][1].endswith("/jmap/session")


def _queued_msg(mid: str, rcpts: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": mid,
        "returnPath": "a@b.c",
        "size": 900,
        "createdAt": "2026-11-15T10:00:00Z",
        "recipients": rcpts,
    }


def test_queue_snapshot_parses_and_classifies() -> None:
    t = FakeTransport().push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/query",
                {"accountId": "b", "position": 0, "ids": ["m1", "m2"], "total": 2},
                "q",
            ],
            [
                "x:QueuedMessage/get",
                {
                    "accountId": "b",
                    "list": [
                        _queued_msg(
                            "m1",
                            {
                                "r@x.y": {
                                    "status": {"@type": "Scheduled"},
                                    "retryDue": "2026-11-15T11:00:00Z",
                                    "queueName": "schedule",
                                }
                            },
                        ),
                        _queued_msg(
                            "m2",
                            {
                                "q@z.w": {
                                    "status": {"@type": "TemporaryFailure"},
                                    "retryDue": "2026-11-15T11:30:00Z",
                                    "queueName": "schedule",
                                },
                                "ok@z.w": {"status": {"@type": "Completed"}},
                            },
                        ),
                    ],
                    "notFound": [],
                },
                "g",
            ],
        ),
    )
    snap = _provisioner(t).queue_snapshot()
    assert snap is not None
    assert snap.total == 2 and snap.deferred == 2 and snap.active == 0
    m0 = snap.items[0]
    assert m0.id == "m1" and m0.recipients == 1
    assert m0.status == "scheduled"
    assert m0.next_retry == "2026-11-15T11:00:00Z"
    m1 = snap.items[1]
    assert m1.recipients == 2 and m1.status == "temporary_failure"
    # one JMAP call — query + get batched
    assert len(t.calls) == 1 and t.calls[0][1].endswith("/jmap/")
    query_args = t.calls[0][2]["methodCalls"][0][1]
    assert query_args["limit"] == 100 and query_args["calculateTotal"] is True


def test_queue_snapshot_not_exposed() -> None:
    # method-level unknownMethod → the contract's available:false
    t = FakeTransport().push(
        200,
        _jmap_resp(["error", {"type": "unknownMethod"}, "q"]),
    )
    assert _provisioner(t).queue_snapshot() is None


def test_queue_retry() -> None:
    # retry_all: query ids → one batched set of nextRetry updates
    t = FakeTransport()
    t.push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/query",
                {"accountId": "b", "position": 0, "ids": ["m1", "m2"], "total": 2},
                "q",
            ]
        ),
    )
    t.push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/set",
                {"accountId": "b", "updated": {"m1": None, "m2": None}},
                "s0",
            ]
        ),
    )
    assert _provisioner(t).queue_retry_all() is True
    update = t.calls[1][2]["methodCalls"][0][1]["update"]
    assert set(update) == {"m1", "m2"}
    assert all("nextRetry" in v for v in update.values())

    # partial failure → False
    t = FakeTransport()
    t.push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/query",
                {"accountId": "b", "position": 0, "ids": ["m1"], "total": 1},
                "q",
            ]
        ),
    )
    t.push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/set",
                {
                    "accountId": "b",
                    "notUpdated": {"m1": {"type": "notFound"}},
                },
                "s0",
            ]
        ),
    )
    assert _provisioner(t).queue_retry_all() is False

    t = FakeTransport().push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/set",
                {"accountId": "b", "updated": {"99": None}},
                "s",
            ]
        ),
    )
    assert _provisioner(t).queue_retry_one("99") is True

    t = FakeTransport().push(
        200,
        _jmap_resp(
            [
                "x:QueuedMessage/set",
                {
                    "accountId": "b",
                    "notUpdated": {"gone": {"type": "notFound"}},
                },
                "s",
            ]
        ),
    )
    assert _provisioner(t).queue_retry_one("gone") is False


def test_dns_records_parse() -> None:
    zone = (
        'v1-rsa-20261107._domainkey.bloomieltsacademy.com. IN TXT (\n'
        '    "v=DKIM1; k=rsa; h=sha256; p=MIIB"\n'
        '    "IjANBg=="\n'
        ')\n'
        'bloomieltsacademy.com. IN TXT "v=spf1 mx -all"\n'
        'bloomieltsacademy.com. IN MX 10 mail.bloomieltsacademy.com.\n'
        '_imaps._tcp.bloomieltsacademy.com. IN SRV 0 1 993 mail.bloomieltsacademy.com.\n'
        'mta-sts.bloomieltsacademy.com. IN CNAME mail.bloomieltsacademy.com.\n'
        'bloomieltsacademy.com. IN CAA 0 issue "letsencrypt.org"\n'
    )
    t = FakeTransport().push(
        200,
        _jmap_resp(
            [
                "x:Domain/query",
                {"accountId": "b", "position": 0, "ids": ["b"]},
                "dq",
            ],
            [
                "x:Domain/get",
                {
                    "accountId": "b",
                    "list": [{"id": "b", "name": "bloomieltsacademy.com",
                              "dnsZoneFile": zone}],
                    "notFound": [],
                },
                "dg",
            ],
        ),
    )
    recs = _provisioner(t).dns_records("bloomieltsacademy.com")
    assert recs is not None and len(recs) == 6
    by_type = {r.type: r for r in recs}
    dkim = recs[0]
    assert dkim.type == "TXT" and dkim.name.startswith("v1-rsa-20261107._domainkey")
    assert dkim.content == "v=DKIM1; k=rsa; h=sha256; p=MIIBIjANBg=="
    assert by_type["MX"].content == "10 mail.bloomieltsacademy.com."
    assert by_type["SRV"].name.startswith("_imaps._tcp")
    assert by_type["CAA"].type == "CAA"
    t = FakeTransport().push(200, _jmap_resp(["error", {"type": "unknownMethod"}, "dq"]))
    assert _provisioner(t).dns_records("bloomieltsacademy.com") is None


def test_delivery_engine_wide_unavailable() -> None:
    """delivery_items(None) → available:false without an engine call —
    engine-wide tracing is Enterprise-only on v0.16+."""
    t = FakeTransport()
    assert _provisioner(t).delivery_items(None, 10) is None
    assert t.calls == []


def test_jmap_delivery_resolves_account_then_one_roundtrip() -> None:
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("s"))
    t.push(
        200,
        _jmap_resp(
            ["Email/query", {"ids": ["m1", "m2"]}, "q"],
            [
                "Email/get",
                {
                    "list": [
                        {
                            "id": "m1",
                            "subject": "hi",
                            "receivedAt": "2026-11-15T08:00:00Z",
                            "from": [{"email": "ext@x.y"}],
                            "to": [{"email": "s@bloomieltsacademy.com"}],
                            "mailboxIds": {"box-in": True},
                            "keywords": {"$seen": True},
                        },
                        {
                            "id": "m2",
                            "subject": "out",
                            "receivedAt": "2026-11-15T08:05:00Z",
                            "from": [{"email": "s@bloomieltsacademy.com"}],
                            "to": [{"email": "friend@y.z"}],
                            "mailboxIds": {"box-sent": True},
                            "keywords": {},
                        },
                    ]
                },
                "e",
            ],
            ["Mailbox/query", {"ids": ["box-in", "box-sent"]}, "mq"],
            [
                "Mailbox/get",
                {
                    "list": [
                        {"id": "box-in", "name": "Inbox"},
                        {"id": "box-sent", "name": "Sent"},
                    ]
                },
                "m",
            ],
        ),
    )
    items = _provisioner(t).delivery_items("s@bloomieltsacademy.com", 10)
    # lookup batch + one mail-JMAP roundtrip — no fan-out
    assert len(t.calls) == 3
    mail_call = t.calls[2]
    assert mail_call[1].endswith("/jmap/")
    assert mail_call[2]["using"] == [
        "urn:ietf:params:jmap:core",
        "urn:ietf:params:jmap:mail",
    ]
    assert len(mail_call[2]["methodCalls"]) == 4
    # resolved opaque account id, not the address
    assert mail_call[2]["methodCalls"][0][1]["accountId"] == "c"
    assert items is not None and len(items) == 2
    inbound, outbound = items[0], items[1]
    assert inbound.direction == "inbound" and inbound.folder == "Inbox" and inbound.status == "seen"
    assert (
        outbound.direction == "outbound"
        and outbound.folder == "Sent"
        and outbound.status == "unseen"
    )


def test_jmap_delivery_error_returns_none() -> None:
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("s"))
    t.push(
        200,
        _jmap_resp(["error", {"type": "accountNotFound"}, "q"]),
    )
    assert _provisioner(t).delivery_items("s@bloomieltsacademy.com", 10) is None


def test_delivery_unknown_account_returns_none() -> None:
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, None)
    p = _provisioner(t)
    assert p.delivery_items("ghost@bloomieltsacademy.com", 10) is None
    assert len(t.calls) == 2  # no mail-JMAP call was made


# ── Service helpers (no infra) ─────────────────────────────────────────────────


def test_generate_password_shape() -> None:
    pw = mail_admin.generate_password()
    assert len(pw) == 16
    assert pw.isalnum()
    assert mail_admin.generate_password() != pw


@requires_infra
def test_audit_guard_rejects_secrets(db: Session) -> None:
    admin = User(
        email=f"qa-audit-{uuid.uuid4().hex[:8]}@example.dev",
        full_name="QA",
        password_hash="x",
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    with pytest.raises(ValueError):
        mail_admin.write_audit(db, admin, "mailbox.test", "t", {"password": "nope"})
    _delete_user(admin.email)


def test_dns_evaluate_matrix() -> None:
    mx = mail_admin.DnsCheck("d.", "MX", "10 mail.d.")
    assert mail_admin._evaluate(mx, ["10 mail.d."]) == ("10 mail.d.", True)
    assert mail_admin._evaluate(mx, ["10 other.d."])[1] is False
    assert mail_admin._evaluate(mx, []) == (None, False)
    assert mail_admin._evaluate(mx, None) == (None, False)

    spf = mail_admin.DnsCheck("d.", "TXT", "v=spf1 mx ra=postmaster -all")
    # missing ra=postmaster → drift → not ok
    assert mail_admin._evaluate(spf, ['"v=spf1 mx -all"'])[1] is False
    assert mail_admin._evaluate(spf, ['"v=spf1 mx ra=postmaster -all"'])[1] is True

    dkim = mail_admin.DnsCheck("s._domainkey.d.", "TXT", "v=DKIM1; k=rsa; p=ABC DEF")
    # keys may arrive split across quoted strings — whitespace-normalized
    assert mail_admin._evaluate(dkim, ['"v=DKIM1; k=rsa; p=ABC" "DEF"'])[1] is True
    assert mail_admin._evaluate(dkim, ['"v=DKIM1; k=rsa; p=WRONG"'])[1] is False

    ptr = mail_admin.DnsCheck("1.2.3.4.in-addr.arpa", "PTR", "mail.d.")
    assert mail_admin._evaluate(ptr, ["mail.d."])[1] is True


def test_expected_checks_engine_and_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import get_settings

    get_settings.cache_clear()
    engine = [
        mail_api.DnsRecord("MX", "bloomieltsacademy.com.", "10 mail.bloomieltsacademy.com."),
        mail_api.DnsRecord("TXT", "bloomieltsacademy.com.", "v=spf1 mx ra=postmaster -all"),
        mail_api.DnsRecord("TXT", "v1-rsa._domainkey.bloomieltsacademy.com.", "v=DKIM1; p=K"),
        mail_api.DnsRecord("SRV", "_imaps._tcp.bloomieltsacademy.com.", "0 1 993 mail.x."),
    ]
    checks = mail_admin.expected_dns_checks(engine)
    names = [c.name for c in checks]
    assert "v1-rsa._domainkey.bloomieltsacademy.com." in names
    assert "_dmarc.bloomieltsacademy.com." in names
    spf = next(c for c in checks if c.name == "bloomieltsacademy.com." and c.rdtype == "TXT")
    assert spf.expected == "v=spf1 mx ra=postmaster -all"  # engine's canonical

    # engine down → static fallback, no DKIM rows
    checks = mail_admin.expected_dns_checks(None)
    assert all("_domainkey" not in c.name for c in checks)
    assert any(c.name == "_dmarc.bloomieltsacademy.com." for c in checks)


def test_der_not_after_parse() -> None:
    # Crafted DER: two adjacent UTCTime fields — validity {notBefore, notAfter}
    der = (
        b"\x30\x00junk" + b"\x17\x0d" + b"250101000000Z" + b"\x17\x0d" + b"301231235959Z" + b"tail"
    )
    out = mail_admin._der_not_after(der)
    assert out == datetime(2030, 12, 31, 23, 59, 59, tzinfo=UTC)
    assert mail_admin._der_not_after(b"\x30\x00" * 8) is None


# ── Router tests (bloom_test) ──────────────────────────────────────────────────


class StubProvisioner:
    """Records provisioning ops; `free` gates check_username."""

    def __init__(self, free: bool = True) -> None:
        self.free = free
        self.created: list[dict[str, Any]] = []
        self.suspended: list[str] = []
        self.unsuspended: list[str] = []
        self.reset: list[tuple[str, str]] = []
        self.errors: dict[str, Exception] = {}

    def _raise(self, op: str) -> None:
        if err := self.errors.get(op):
            raise err

    def check_username(self, localpart: str) -> bool:
        return self.free

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> Any:
        self._raise("create")
        self.created.append({"localpart": localpart, "secret": secret, "quota_mb": quota_mb})
        return mail_api.MailboxInfo(
            localpart, f"{localpart}@bloomieltsacademy.com", "active", quota_mb
        )

    def suspend(self, localpart: str) -> Any:
        self._raise("suspend")
        self.suspended.append(localpart)
        return mail_api.MailboxInfo(
            localpart, f"{localpart}@bloomieltsacademy.com", "suspended", 1024
        )

    def unsuspend(self, localpart: str) -> Any:
        self._raise("unsuspend")
        self.unsuspended.append(localpart)
        return mail_api.MailboxInfo(localpart, f"{localpart}@bloomieltsacademy.com", "active", 1024)

    def reset_password(self, localpart: str, secret: str) -> Any:
        self._raise("reset")
        self.reset.append((localpart, secret))
        return mail_api.MailboxInfo(localpart, f"{localpart}@bloomieltsacademy.com", "active", 1024)


class StubInspector:
    def __init__(self) -> None:
        self.reachable = True
        self.snapshot: mail_api.QueueSnapshot | None = None
        self.dns: list[mail_api.DnsRecord] | None = []
        self.delivery: list[mail_api.DeliveryItem] | None = []
        self.retry_all_result = True
        self.retry_results: dict[str, bool] = {}
        self.unavailable = False

    def ping(self) -> bool:
        return self.reachable

    def queue_snapshot(self, limit: int = 100) -> mail_api.QueueSnapshot | None:
        if self.unavailable:
            raise mail_api.MailUnavailableError("mail API unreachable")
        return self.snapshot

    def queue_retry_all(self) -> bool:
        return self.retry_all_result

    def queue_retry_one(self, message_id: str) -> bool:
        return self.retry_results.get(message_id, True)

    def dns_records(self, domain: str) -> list[mail_api.DnsRecord] | None:
        return self.dns

    def delivery_items(self, account: str | None, limit: int) -> list[mail_api.DeliveryItem] | None:
        if self.unavailable:
            raise mail_api.MailUnavailableError("mail API unreachable")
        return self.delivery


@contextmanager
def _admin_client(
    provisioner: Any, inspector: Any, redis_stub: Any
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[mail_api.get_mail_provisioner] = lambda: provisioner
    app.dependency_overrides[mail_api.get_mail_inspector] = lambda: inspector
    app.dependency_overrides[get_redis] = lambda: redis_stub
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _audit_rows(
    db: Session, action: str | None = None, admin_id: str | None = None
) -> list[MailAdminAudit]:
    """Audit rows for this test's admin — bloom_test rows persist across
    runs, so each test scopes to the fresh admin it created."""
    q = select(MailAdminAudit)
    if action:
        q = q.where(MailAdminAudit.action == action)
    if admin_id:
        q = q.where(MailAdminAudit.admin_user_id == uuid.UUID(admin_id))
    return list(db.scalars(q.order_by(MailAdminAudit.created_at)))


@requires_infra
def test_admin_create_mailbox(db: Session, redis_db1: Redis) -> None:
    prov = StubProvisioner()
    localpart = f"svc-{uuid.uuid4().hex[:8]}"
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(prov, StubInspector(), redis_db1) as c:
            r = c.post(
                "/api/admin/mailboxes",
                headers=headers,
                json={"localpart": localpart, "password": "svc-pass-123", "quotaMb": 512},
            )
            assert r.status_code == 201, r.text
            body = r.json()
            assert body["localpart"] == localpart
            assert body["status"] == "active"
            assert body["user_id"] is None  # standalone — no platform account
            assert prov.created[0]["quota_mb"] == 512
            assert prov.created[0]["secret"].startswith("$argon2id$")
            assert "svc-pass-123" not in prov.created[0]["secret"]

            # mirror row on disk
            with psycopg.connect(PG_DSN) as conn:
                row = conn.execute(
                    "SELECT status, user_id, mail_secret FROM mailboxes WHERE localpart=%s",
                    (localpart,),
                ).fetchone()
            assert row == ("active", None, None)  # plaintext never stored

            # duplicate → 409 (mirror check)
            r = c.post(
                "/api/admin/mailboxes",
                headers=headers,
                json={"localpart": localpart.upper(), "password": "svc-pass-123"},
            )
            assert r.status_code == 409

            # audit row exists and carries no secret
            audits = _audit_rows(db, "mailbox.create", admin_id)
            assert len(audits) == 1
            assert audits[0].admin_user_id == uuid.UUID(admin_id)
            assert audits[0].target == localpart
            assert "svc-pass-123" not in str(audits[0].detail)
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))
        with psycopg.connect(PG_DSN) as conn:
            conn.execute("DELETE FROM mailboxes WHERE localpart=%s", (localpart,))


@requires_infra
def test_admin_create_mailbox_validation(db: Session, redis_db1: Redis) -> None:
    prov = StubProvisioner()
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(prov, StubInspector(), redis_db1) as c:
            for bad in ["postmaster", "a..b", "-lead"]:
                r = c.post(
                    "/api/admin/mailboxes",
                    headers=headers,
                    json={"localpart": bad, "password": "svc-pass-123"},
                )
                assert r.status_code == 400, bad
            r = c.post(
                "/api/admin/mailboxes",
                headers=headers,
                json={"localpart": "ok-name", "password": "short"},
            )
            assert r.status_code == 422
            assert prov.created == []
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_create_conflict_on_engine(db: Session, redis_db1: Redis) -> None:
    prov = StubProvisioner(free=False)  # engine says taken
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(prov, StubInspector(), redis_db1) as c:
            r = c.post(
                "/api/admin/mailboxes",
                headers=headers,
                json={"localpart": f"eng-{uuid.uuid4().hex[:6]}", "password": "svc-pass-123"},
            )
            assert r.status_code == 409
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_suspend_unsuspend(db: Session, redis_db1: Redis) -> None:
    box = _make_mailbox(db, status=MailboxStatus.active)
    prov = StubProvisioner()
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(prov, StubInspector(), redis_db1) as c:
            r = c.post(f"/api/admin/mailboxes/{box.id}/suspend", headers=headers)
            assert r.status_code == 200 and r.json() == {"status": "suspended"}
            assert prov.suspended == [box.localpart]
            box = _fresh(db, box)
            assert box.status == MailboxStatus.suspended

            r = c.post(f"/api/admin/mailboxes/{box.id}/unsuspend", headers=headers)
            assert r.status_code == 200 and r.json() == {"status": "active"}
            box = _fresh(db, box)
            assert box.status == MailboxStatus.active

            actions = [a.action for a in _audit_rows(db, admin_id=admin_id)]
            assert "mailbox.suspend" in actions and "mailbox.unsuspend" in actions

            # engine 404 → route 404
            prov.errors["suspend"] = mail_api.MailNotFoundError("gone")
            r = c.post(f"/api/admin/mailboxes/{box.id}/suspend", headers=headers)
            assert r.status_code == 404
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_reset_password(db: Session, redis_db1: Redis) -> None:
    box = _make_mailbox(db, status=MailboxStatus.active)
    prov = StubProvisioner()
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(prov, StubInspector(), redis_db1) as c:
            r = c.post(f"/api/admin/mailboxes/{box.id}/reset-password", headers=headers)
            assert r.status_code == 200
            pw = r.json()["password"]
            assert len(pw) == 16
            lp, secret = prov.reset[0]
            assert lp == box.localpart
            assert secret.startswith("$argon2id$") and pw not in secret
            box = _fresh(db, box)
            assert box.mail_secret is None
            audit = _audit_rows(db, "mailbox.reset_password", admin_id)[0]
            assert pw not in str(audit.detail)
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_mailbox_test(db: Session, redis_db1: Redis, monkeypatch: pytest.MonkeyPatch) -> None:
    box = _make_mailbox(db, status=MailboxStatus.active)
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    smtp_calls: list[tuple[str, str, str]] = []
    imap_calls: list[tuple[str, str, str]] = []

    def fake_smtp(host: str, addr: str, pw: str, timeout: float) -> tuple[bool, str | None]:
        smtp_calls.append((host, addr, pw))
        return True, None

    def fake_imap(host: str, addr: str, pw: str, timeout: float) -> tuple[bool, str | None]:
        imap_calls.append((host, addr, pw))
        return False, "imap: auth rejected"

    monkeypatch.setattr(mail_admin, "smtp_auth_probe", fake_smtp)
    monkeypatch.setattr(mail_admin, "imap_login_probe", fake_imap)
    try:
        with _admin_client(StubProvisioner(), StubInspector(), redis_db1) as c:
            r = c.post(
                f"/api/admin/mailboxes/{box.id}/test",
                headers=headers,
                json={"password": "transient-pw"},
            )
            assert r.status_code == 200, r.text
            assert r.json() == {
                "smtpAuth": True,
                "imap": False,
                "error": "imap: auth rejected",
            }
            assert smtp_calls[0][1] == f"{box.localpart}@bloomieltsacademy.com"
            assert smtp_calls[0][2] == "transient-pw"  # passed through, never stored
            audit = _audit_rows(db, "mailbox.test", admin_id)[0]
            assert audit.detail == {
                "localpart": box.localpart,
                "smtpAuth": True,
                "imap": False,
            }
            assert "transient-pw" not in str(audit.detail)
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_probe_rate_limit(
    db: Session, redis_db1: Redis, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.core.config import get_settings

    box = _make_mailbox(db, status=MailboxStatus.active)
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    monkeypatch.setattr(mail_admin, "smtp_auth_probe", lambda *a: (True, None))
    monkeypatch.setattr(mail_admin, "imap_login_probe", lambda *a: (True, None))
    monkeypatch.setattr(mail_admin, "send_test_message", lambda *a: "<x@bloomieltsacademy.com>")
    try:
        with _admin_client(StubProvisioner(), StubInspector(), redis_db1) as c:
            limit = get_settings().mail_admin_probe_limit
            for _ in range(limit):
                r = c.post(
                    f"/api/admin/mailboxes/{box.id}/test",
                    headers=headers,
                    json={"password": "x"},
                )
                assert r.status_code == 200
            # shared bucket: test-send hits the same window
            r = c.post(
                "/api/admin/mail/test-send",
                headers=headers,
                json={"to": "anyone@example.dev"},
            )
            assert r.status_code == 429
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_status(db: Session, redis_db1: Redis, monkeypatch: pytest.MonkeyPatch) -> None:
    inspector = StubInspector()
    inspector.snapshot = mail_api.QueueSnapshot(total=3, active=1, deferred=2)
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    monkeypatch.setattr(
        mail_admin,
        "tcp_probe",
        lambda host, port, timeout: port != 587,  # live state: 587 dead
    )
    monkeypatch.setattr(
        mail_admin,
        "tls_cert_info",
        lambda *a: {
            "host": "mail.bloomieltsacademy.com",
            "expires_at": datetime(2027, 11, 15, tzinfo=UTC),
            "days_remaining": 365,
        },
    )
    try:
        with _admin_client(StubProvisioner(), inspector, redis_db1) as c:
            r = c.get("/api/admin/mail/status", headers=headers)
            assert r.status_code == 200
            body = r.json()
            assert body["engine"] == "stalwart"
            assert body["apiReachable"] is True
            ports = {lsn["port"]: lsn["ok"] for lsn in body["listeners"]}
            assert ports == {25: True, 587: False, 465: True, 993: True}
            assert body["tls"]["daysRemaining"] == 365
            assert body["queue"] == {"active": 1, "deferred": 2}

            inspector.snapshot = None  # OSS: not exposed
            body = c.get("/api/admin/mail/status", headers=headers).json()
            assert body["queue"] is None
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_dns(db: Session, redis_db1: Redis, monkeypatch: pytest.MonkeyPatch) -> None:
    inspector = StubInspector()
    inspector.dns = [
        mail_api.DnsRecord("MX", "bloomieltsacademy.com.", "10 mail.bloomieltsacademy.com."),
        mail_api.DnsRecord("TXT", "bloomieltsacademy.com.", "v=spf1 mx -all"),
        mail_api.DnsRecord("TXT", "v1-rsa._domainkey.bloomieltsacademy.com.", "v=DKIM1; p=K"),
    ]
    answers = {
        ("bloomieltsacademy.com.", "MX"): ["10 mail.bloomieltsacademy.com."],
        ("bloomieltsacademy.com.", "TXT"): ["v=spf1 mx -all"],
        ("_dmarc.bloomieltsacademy.com.", "TXT"): ["v=DMARC1; p=reject"],
        ("v1-rsa._domainkey.bloomieltsacademy.com.", "TXT"): ["v=DKIM1; p=K"],
        ("mail.bloomieltsacademy.com", "A"): ["72.61.90.150"],
        ("150.90.61.72.in-addr.arpa", "PTR"): ["mail.bloomieltsacademy.com."],
    }
    monkeypatch.setattr(
        mail_admin,
        "doh_lookup",
        lambda client, base, name, rdtype: answers.get((name, rdtype), []),
    )
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(StubProvisioner(), inspector, redis_db1) as c:
            r = c.get("/api/admin/mail/dns", headers=headers)
            assert r.status_code == 200
            records = r.json()["records"]
            assert all(rec["ok"] for rec in records), records
            names = [rec["name"] for rec in records]
            assert "v1-rsa._domainkey.bloomieltsacademy.com." in names
            assert "150.90.61.72.in-addr.arpa" in names
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_queue(db: Session, redis_db1: Redis) -> None:
    inspector = StubInspector()
    inspector.snapshot = mail_api.QueueSnapshot(
        total=1,
        deferred=1,
        items=[
            mail_api.QueueMessage(
                id="42",
                return_path="bounces@x.y",
                size=1200,
                created="2026-11-15T07:00:00Z",
                status="scheduled",
                next_retry="2026-11-15T12:00:00Z",
                recipients=1,
                in_flight=False,
            )
        ],
    )
    inspector.retry_results = {"gone": False}
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(StubProvisioner(), inspector, redis_db1) as c:
            r = c.get("/api/admin/mail/queue", headers=headers)
            assert r.status_code == 200
            body = r.json()
            assert body["available"] is True and body["total"] == 1
            assert body["items"][0]["id"] == "42"
            assert body["items"][0]["returnPath"] == "bounces@x.y"

            r = c.post("/api/admin/mail/queue/retry", headers=headers, json={"all": True})
            assert r.json() == {"available": True, "retried": 1, "error": None}

            r = c.post(
                "/api/admin/mail/queue/retry",
                headers=headers,
                json={"ids": ["42", "gone"]},
            )
            assert r.json()["retried"] == 1 and r.json()["error"]

            audit = _audit_rows(db, "queue.retry", admin_id)
            assert len(audit) == 2

            inspector.snapshot = None
            r = c.get("/api/admin/mail/queue", headers=headers)
            assert r.json() == {"available": False, "items": [], "total": 0}
            r = c.post("/api/admin/mail/queue/retry", headers=headers, json={"all": True})
            assert r.json()["available"] is False
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_test_send_unconfigured(
    db: Session, redis_db1: Redis, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    monkeypatch.setattr(mail_admin, "send_test_message", lambda *a: "<x@bloomieltsacademy.com>")
    try:
        with _admin_client(StubProvisioner(), StubInspector(), redis_db1) as c:
            r = c.post(
                "/api/admin/mail/test-send",
                headers=headers,
                json={"to": "dest@example.dev"},
            )
            assert r.status_code == 503
            assert r.json() == {
                "accepted": False,
                "messageId": None,
                "error": "unavailable",
            }
            audit = _audit_rows(db, "engine.test_send", admin_id)[0]
            assert audit.detail["reason"] == "unconfigured"
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_delivery(db: Session, redis_db1: Redis) -> None:
    inspector = StubInspector()
    inspector.delivery = [
        mail_api.DeliveryItem(
            id="m1",
            direction="inbound",
            sender="ext@x.y",
            to=["s@bloomieltsacademy.com"],
            subject="hello",
            received_at="2026-11-15T08:00:00Z",
            status="seen",
            folder="Inbox",
        )
    ]
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(StubProvisioner(), inspector, redis_db1) as c:
            r = c.get(
                "/api/admin/mail/delivery?account=s@bloomieltsacademy.com&limit=5",
                headers=headers,
            )
            assert r.status_code == 200
            body = r.json()
            assert body["available"] is True
            assert body["items"][0]["from"] == "ext@x.y"
            assert body["items"][0]["folder"] == "Inbox"
            assert body["items"][0]["receivedAt"] == "2026-11-15T08:00:00Z"

            inspector.delivery = None
            r = c.get("/api/admin/mail/delivery", headers=headers)
            assert r.json() == {"available": False, "items": []}
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_queue_delivery_degrade_when_api_unreachable(
    db: Session, redis_db1: Redis
) -> None:
    """Contract: unreachable engine → 200 + available:false, never a 502."""
    inspector = StubInspector()
    inspector.unavailable = True
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _admin_client(StubProvisioner(), inspector, redis_db1) as c:
            r = c.get("/api/admin/mail/queue", headers=headers)
            assert r.status_code == 200
            assert r.json() == {"available": False, "items": [], "total": 0}
            r = c.get("/api/admin/mail/delivery", headers=headers)
            assert r.status_code == 200
            assert r.json() == {"available": False, "items": []}
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_engine_routes_require_admin(db: Session, redis_db1: Redis) -> None:
    student = User(
        email=f"qa-{uuid.uuid4().hex[:8]}@example.dev",
        full_name="QA",
        password_hash="x",
        role=UserRole.student,
    )
    db.add(student)
    db.commit()
    try:
        token, _ = create_access_token(student.id, UserRole.student)
        h = {"Authorization": f"Bearer {token}"}
        with _admin_client(StubProvisioner(), StubInspector(), redis_db1) as c:
            assert c.get("/api/admin/mail/status", headers=h).status_code == 403
            assert c.get("/api/admin/mail/status").status_code == 401
            assert (
                c.post("/api/admin/mail/test-send", headers=h, json={"to": "a@b.c"}).status_code
                == 403
            )
            assert (
                c.post(
                    "/api/admin/mailboxes",
                    headers=h,
                    json={"localpart": "x", "password": "svc-pass-123"},
                ).status_code
                == 403
            )
    finally:
        _delete_user(student.email)
