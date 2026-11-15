"""Tests for TEC-184 — mail provisioning contract client + signup wiring.

Coverage per the issue:

- Stalwart mock (`FakeTransport`): adapter request shape + error taxonomy
- retry path: retryable failure → ZSET retry → promote → success
- duplicate create_mailbox idempotency: provider 409 → converges active
- username availability edge cases: invalid / reserved / taken / free /
  provider-down
- worker failure → queued retry; non-retryable → failed; max attempts → failed
- signup wiring: register(+mail fields) → mirror row + enqueued job; 409 on
  taken localpart; 422 on unpaired fields

Infra tests run against bloom_test (never bloom — TEC-179) and Redis db 1 on
the local stack; the db-1 flush in fixtures can't touch the app's db-0 state.
"""

from __future__ import annotations

import json
import socket
import uuid
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import psycopg
import pytest
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import create_access_token, verify_password
from app.integrations import mail_api
from app.integrations.mail_api import (
    MailUnavailableError,
    StalwartProvisioner,
)
from app.main import app
from app.models.enums import MailboxStatus, UserRole
from app.models.mailbox import Mailbox
from app.models.user import User
from app.services import mail_jobs

client = TestClient(app)

PG_DSN = "postgresql://bloom:bloom_dev_password@localhost:5433/bloom_test"
REDIS_TEST_URL = "redis://localhost:6380/1"


def _infra_up() -> bool:
    try:
        socket.create_connection(("localhost", 5433), timeout=1).close()
        socket.create_connection(("localhost", 6380), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


# ── Stalwart mock ─────────────────────────────────────────────────────────────


class FakeTransport:
    """Canned (method → (status, body, headers)) responses + call log."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, Any]] = []
        self.call_headers: list[dict[str, str]] = []
        self.responses: list[tuple[int, Any, dict[str, str]]] = []
        self.raise_error: Exception | None = None

    def push(
        self, status: int, body: Any = None, headers: dict[str, str] | None = None
    ) -> FakeTransport:
        self.responses.append((status, body, headers or {}))
        return self

    def __call__(
        self, method: str, url: str, headers: dict[str, str], body: Any
    ) -> tuple[int, Any, dict[str, str]]:
        self.calls.append((method, url, body))
        self.call_headers.append(headers)
        if self.raise_error is not None:
            raise self.raise_error
        assert self.responses, f"unexpected call: {method} {url}"
        status, resp_body, resp_headers = self.responses.pop(0)
        if status >= 400:
            return status, resp_body, resp_headers
        return status, resp_body, resp_headers


def _provisioner(transport: FakeTransport) -> StalwartProvisioner:
    return StalwartProvisioner(
        base_url="https://mail.test",
        token="test-token",
        domain="bloomieltsacademy.com",
        timeout=1.0,
        transport=transport,
    )


# ── JMAP fixtures (Stalwart ≥0.16 shapes — verified live, TEC-192) ────────────


def _jmap_resp(*calls: list[Any]) -> dict[str, Any]:
    return {"methodResponses": [list(c) for c in calls], "sessionState": "s1"}


def _push_domain(t: FakeTransport, ids: list[str] | None = None) -> None:
    t.push(
        200,
        _jmap_resp(
            [
                "x:Domain/query",
                {"accountId": "b", "position": 0,
                 "ids": ["b"] if ids is None else ids},
                "dq",
            ]
        ),
    )


def _account(localpart: str, **over: Any) -> dict[str, Any]:
    acct: dict[str, Any] = {
        "id": "c",
        "@type": "User",
        "name": localpart,
        "domainId": "b",
        "emailAddress": f"{localpart}@bloomieltsacademy.com",
        "permissions": {"@type": "Inherit"},
        "quotas": {"maxDiskQuota": 2 * 1_048_576},
        "roles": {"@type": "User"},
        "description": "",
    }
    acct.update(over)
    return acct


def _push_lookup(t: FakeTransport, acct: dict[str, Any] | None) -> None:
    """query{name,domainId} + get(#ids) batch — one HTTP call."""
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/query",
                {
                    "accountId": "b",
                    "position": 0,
                    "ids": [acct["id"]] if acct else [],
                },
                "aq",
            ],
            [
                "x:Account/get",
                {
                    "accountId": "b",
                    "list": [acct] if acct else [],
                    "notFound": [],
                },
                "ag",
            ],
        )
    )


# ── Adapter unit tests (no infra) ──────────────────────────────────────────────


def test_adapter_sends_bearer_and_create_shape() -> None:
    t = FakeTransport()
    _push_domain(t)
    t.push(
        200,
        _jmap_resp(
            ["x:Account/set", {"accountId": "b", "created": {"c1": {"id": "e"}}}, "s"]
        ),
    )
    p = _provisioner(t)
    info = p.create_mailbox("r.sharma", "$argon2id$hash", 1024, "R Sharma")
    # Call 0: domain resolution; call 1: the create — both POST /jmap/.
    assert t.calls[0][0] == "POST" and t.calls[0][1] == "https://mail.test/jmap/"
    assert t.calls[0][2]["methodCalls"][0][0] == "x:Domain/query"
    method, url, body = t.calls[1]
    assert method == "POST" and url == "https://mail.test/jmap/"
    assert body["using"] == ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"]
    name, args, _cid = body["methodCalls"][0]
    assert name == "x:Account/set"
    create = args["create"]["c1"]
    assert create["@type"] == "User"
    assert create["name"] == "r.sharma"  # localpart, not the address
    assert create["domainId"] == "b"
    # pre-hashed argon2id goes verbatim into the Password credential
    assert create["credentials"] == {
        "0": {"@type": "Password", "secret": "$argon2id$hash"}
    }
    assert create["quotas"] == {"maxDiskQuota": 1024 * 1_048_576}
    assert create["roles"] == {"@type": "User"}
    assert create["description"] == "R Sharma"
    headers = t.call_headers[1]
    assert headers["Authorization"] == "Bearer test-token"
    assert headers["User-Agent"]  # explicit UA — Cloudflare bans urllib's
    assert info.status == "active" and info.quota_mb == 1024


def test_create_omits_empty_description() -> None:
    """`description:""` is rejected `invalidPatch` live — and would mask the
    `primaryKeyViolation` on idempotent replays, so it's omitted."""
    t = FakeTransport()
    _push_domain(t)
    t.push(
        200,
        _jmap_resp(
            ["x:Account/set", {"accountId": "b", "created": {"c1": {"id": "e"}}}, "s"]
        ),
    )
    _provisioner(t).create_mailbox("r.sharma", "h", 1024)  # no display_name
    create = t.calls[1][2]["methodCalls"][0][1]["create"]["c1"]
    assert "description" not in create


def test_adapter_create_conflict_is_idempotent() -> None:
    """Duplicate → `notCreated` primaryKeyViolation → re-fetch → success."""
    t = FakeTransport()
    _push_domain(t)
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/set",
                {
                    "accountId": "b",
                    "notCreated": {
                        "c1": {
                            "type": "primaryKeyViolation",
                            "properties": ["email"],
                            "objectId": {"object": "Account", "id": "c"},
                        }
                    },
                },
                "s",
            ]
        ),
    )
    _push_lookup(t, _account("r.sharma"))
    p = _provisioner(t)
    first = p.create_mailbox("r.sharma", "h1", 1024)
    # replay — same path (domain id is cached, no re-query)
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/set",
                {
                    "accountId": "b",
                    "notCreated": {
                        "c1": {"type": "primaryKeyViolation", "properties": ["email"]}
                    },
                },
                "s",
            ]
        ),
    )
    _push_lookup(t, _account("r.sharma"))
    second = p.create_mailbox("r.sharma", "h1", 1024)
    assert first.status == second.status == "active"
    assert first.address == "r.sharma@bloomieltsacademy.com"


def test_check_username() -> None:
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, None)  # no exact match → free
    assert _provisioner(t).check_username("free") is True

    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("taken"))
    assert _provisioner(t).check_username("taken") is False

    # adapter-side exact match: a substring-different result still means free
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("taken2"))
    assert _provisioner(t).check_username("taken") is True


def test_error_taxonomy() -> None:
    cases = [
        (400, mail_api.MailInvalidRequestError, False),
        (401, mail_api.MailUnauthorizedError, False),
        (403, mail_api.MailUnauthorizedError, False),
        (404, mail_api.MailNotFoundError, False),
        (409, mail_api.MailConflictError, False),
        (422, mail_api.MailInvalidLocalpartError, False),
        (429, mail_api.MailRateLimitedError, True),
        (502, MailUnavailableError, True),
        (503, MailUnavailableError, True),
    ]
    for status, exc_cls, retryable in cases:
        # HTTP layer: RFC 9457 problem+json envelope
        t = FakeTransport().push(
            status, {"type": "about:blank", "title": "x", "status": status},
            {"Retry-After": "7"},
        )
        p = _provisioner(t)
        with pytest.raises(exc_cls) as ei:
            p.list_mailboxes(1, 10)
        assert ei.value.retryable is retryable
        if status == 429:
            assert ei.value.retry_after == 7.0


def test_method_error_mapping() -> None:
    """Method-level ["error",{type},call] inside HTTP 200 → taxonomy."""
    cases = [
        ("forbidden", mail_api.MailUnauthorizedError),
        ("invalidArguments", mail_api.MailInvalidRequestError),
        ("notFound", mail_api.MailNotFoundError),
        ("serverUnavailable", MailUnavailableError),
        ("serverFail", MailUnavailableError),
    ]
    for etype, exc_cls in cases:
        t = FakeTransport()
        _push_domain(t)
        t.push(200, _jmap_resp(["error", {"type": etype, "description": "d"}, "aq"]))
        with pytest.raises(exc_cls):
            _provisioner(t).check_username("x")


def test_set_error_mapping() -> None:
    """`notUpdated`/`notCreated` per-record errors → taxonomy."""
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("a"))
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/set",
                {
                    "accountId": "b",
                    "notUpdated": {"c": {"type": "forbidden", "description": "no"}},
                },
                "s",
            ]
        ),
    )
    with pytest.raises(mail_api.MailUnauthorizedError):
        _provisioner(t).suspend("a")

    t = FakeTransport()
    _push_domain(t)
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/set",
                {
                    "accountId": "b",
                    "notCreated": {
                        "c1": {"type": "invalidProperties", "properties": ["name"]}
                    },
                },
                "s",
            ]
        ),
    )
    with pytest.raises(mail_api.MailInvalidRequestError):
        _provisioner(t).create_mailbox("new.box", "h", 1)


def test_missing_domain_is_unavailable() -> None:
    t = FakeTransport()
    _push_domain(t, ids=[])  # MAIL_DOMAIN absent on the engine
    with pytest.raises(MailUnavailableError):
        _provisioner(t).check_username("x")


def test_domain_id_cached() -> None:
    """Domain id resolves once — repeat calls skip the Domain/query hop."""
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, _account("one"))
    _push_lookup(t, _account("two"))
    p = _provisioner(t)
    p.check_username("one")
    p.check_username("two")
    domain_queries = [
        c for c in t.calls
        if c[2]["methodCalls"][0][0] == "x:Domain/query"
    ]
    assert len(domain_queries) == 1
    assert len(t.calls) == 3  # domain + 2 lookup batches


def test_suspend_payload() -> None:
    acct = _account("a")
    suspended = _account(
        "a",
        permissions={
            "@type": "Merge",
            "enabledPermissions": {},
            "disabledPermissions": {"authenticate": True, "emailSend": True},
        },
    )
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, acct)  # resolve id
    t.push(
        200,
        _jmap_resp(
            ["x:Account/set", {"accountId": "b", "updated": {"c": None}}, "s"]
        ),
    )
    _push_lookup(t, suspended)  # _fetch confirms the new state
    p = _provisioner(t)
    info = p.suspend("a")
    set_call = t.calls[2][2]["methodCalls"][0]
    assert set_call[0] == "x:Account/set"
    update = set_call[1]["update"]["c"]
    assert update == {
        "permissions": {
            "@type": "Merge",
            "disabledPermissions": {"authenticate": True, "emailSend": True},
        }
    }
    assert info.status == "suspended"


def test_unsuspend_and_reset_and_quota() -> None:
    acct = _account("a")
    t = FakeTransport()
    _push_domain(t)
    p = _provisioner(t)
    ops: list[tuple[Any, ...]] = [
        (p.unsuspend, "a"),
        (p.reset_password, "a", "h2"),
        (p.set_quota, "a", 512),
    ]
    for op, *args in ops:
        _push_lookup(t, acct)
        t.push(
            200,
            _jmap_resp(
                ["x:Account/set", {"accountId": "b", "updated": {"c": None}}, "s"]
            ),
        )
        _push_lookup(t, acct)
        info = op(*args)
        assert info.status == "active"
    patches = [
        t.calls[i][2]["methodCalls"][0][1]["update"]["c"]
        for i in (2, 5, 8)
    ]
    assert patches[0] == {"permissions": {"@type": "Inherit"}}
    assert patches[1]["credentials"]["0"]["secret"] == "h2"
    assert patches[2] == {"quotas": {"maxDiskQuota": 512 * 1_048_576}}


def test_suspend_missing_is_not_found() -> None:
    t = FakeTransport()
    _push_domain(t)
    _push_lookup(t, None)
    with pytest.raises(mail_api.MailNotFoundError):
        _provisioner(t).suspend("ghost")


def test_list_mailboxes_maps_users_only() -> None:
    t = FakeTransport()
    _push_domain(t)
    t.push(
        200,
        _jmap_resp(
            [
                "x:Account/query",
                {"accountId": "b", "position": 0, "ids": ["c", "g"], "total": 2},
                "aq",
            ],
            [
                "x:Account/get",
                {
                    "accountId": "b",
                    "list": [
                        _account("r.sharma"),
                        {
                            "id": "g",
                            "@type": "Group",
                            "name": "staff",
                            "domainId": "b",
                        },
                    ],
                    "notFound": [],
                },
                "ag",
            ],
        )
    )
    page = _provisioner(t).list_mailboxes(1, 10)
    assert page.total == 2
    assert len(page.items) == 1  # the Group row is filtered out
    item = page.items[0]
    assert item.localpart == "r.sharma"
    assert item.address == "r.sharma@bloomieltsacademy.com"
    assert item.status == "active" and item.quota_mb == 2
    # pagination args
    query_args = t.calls[1][2]["methodCalls"][0][1]
    assert query_args["position"] == 0 and query_args["limit"] == 10
    assert query_args["filter"] == {"domainId": "b"}
    assert query_args["calculateTotal"] is True




def test_mail_url_scheme_gate() -> None:
    """C1 — https required; loopback http allowed for dev/tests only."""
    assert mail_api._mail_url_allowed("https://mail.example.com") is True
    assert mail_api._mail_url_allowed("https://mail.example.com:8443/api") is True
    assert mail_api._mail_url_allowed("http://localhost:8080") is True
    assert mail_api._mail_url_allowed("http://127.0.0.1:8080") is True
    assert mail_api._mail_url_allowed("http://mail.example.com") is False
    assert mail_api._mail_url_allowed("http://72.61.90.150") is False
    assert mail_api._mail_url_allowed("mail.example.com") is False
    assert mail_api._mail_url_allowed("") is False

def test_localpart_rules() -> None:
    assert mail_api.localpart_error("r.sharma") is None
    assert mail_api.localpart_error("a") is None
    assert mail_api.localpart_error("R.SHARMA") is None  # normalized internally
    for bad in ["", ".dot", "dot.", "a..b", "a b", "a@b", "-lead", "x" * 65]:
        assert mail_api.localpart_error(bad) == "invalid", bad
    for reserved in ["postmaster", "abuse", "admin", "noreply"]:
        assert mail_api.localpart_error(reserved) == "reserved", reserved


# ── In-memory Redis stub (rate limiter + enqueue; mirrors test_auth pattern) ───


class _FakePipeline:
    def __init__(self, store: dict[str, Any]) -> None:
        self._store = store
        self._ops: list[tuple[Any, ...]] = []

    def set(
        self, key: str, value: int, ex: int | None = None, nx: bool = False
    ) -> _FakePipeline:
        self._ops.append(("set", key, value, nx))
        return self

    def incr(self, key: str) -> _FakePipeline:
        self._ops.append(("incr", key))
        return self

    def execute(self) -> list[Any]:
        out = []
        for op in self._ops:
            if op[0] == "set":
                _, key, value, nx = op
                if nx and key in self._store:
                    out.append(False)
                else:
                    self._store[key] = value
                    out.append(True)
            else:
                self._store[op[1]] = int(self._store.get(op[1], 0)) + 1
                out.append(self._store[op[1]])
        return out


class FakeRedis:
    """Just enough for rate_limit.hit: pipeline(set nx ex, incr)."""

    def __init__(self) -> None:
        self.store: dict[str, Any] = {}
        self.pushed: list[str] = []

    def pipeline(self) -> _FakePipeline:
        return _FakePipeline(self.store)

    def lpush(self, key: str, value: str) -> int:
        self.pushed.append(value)
        return 1


class FakeProvisioner:
    def __init__(self, free: bool = True, error: Exception | None = None) -> None:
        self.free = free
        self.error = error
        self.checked: list[str] = []

    def check_username(self, localpart: str) -> bool:
        self.checked.append(localpart)
        if self.error:
            raise self.error
        return self.free


@contextmanager
def _client_with(
    provisioner: Any, redis_stub: Any, db_stub: Any = None
) -> Generator[TestClient, None, None]:
    """TestClient with the mail/redis deps stubbed; optionally a no-DB session.

    `db_stub` fakes the mirror-table lookup (`.scalar() → None` = unclaimed),
    keeping the availability tests hermetic — the endpoint only runs one
    scalar against the mirror before the provider hop.
    """
    app.dependency_overrides[mail_api.get_mail_provisioner] = lambda: provisioner
    app.dependency_overrides[get_redis] = lambda: redis_stub
    if db_stub is not None:
        app.dependency_overrides[get_db] = lambda: db_stub
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _no_mailboxes_db() -> MagicMock:
    stub = MagicMock()
    stub.scalar.return_value = None
    return stub


# ── Availability endpoint (naming rules — no infra needed) ────────────────────


def test_availability_invalid_and_reserved() -> None:
    provisioner = FakeProvisioner(free=True)
    with _client_with(provisioner, FakeRedis(), _no_mailboxes_db()) as c:
        assert c.get("/api/mailboxes/availability?localpart=A..B").json() == {
            "localpart": "a..b",
            "available": False,
            "reason": "invalid",
        }
        r = c.get("/api/mailboxes/availability?localpart=postmaster").json()
        assert r == {"localpart": "postmaster", "available": False, "reason": "reserved"}
        # Naming rules answer locally — the provider is never consulted.
        assert provisioner.checked == []


def test_availability_free_and_taken() -> None:
    provisioner = FakeProvisioner(free=True)
    with _client_with(provisioner, FakeRedis(), _no_mailboxes_db()) as c:
        r = c.get("/api/mailboxes/availability?localpart=R.Sharma").json()
        assert r["available"] is True and r["reason"] == "available"
        assert r["localpart"] == "r.sharma"  # normalized
    provisioner = FakeProvisioner(free=False)
    with _client_with(provisioner, FakeRedis(), _no_mailboxes_db()) as c:
        r = c.get("/api/mailboxes/availability?localpart=taken").json()
        assert r == {"localpart": "taken", "available": False, "reason": "taken"}


def test_availability_provider_down_is_advisory() -> None:
    provisioner = FakeProvisioner(error=MailUnavailableError("down"))
    with _client_with(provisioner, FakeRedis(), _no_mailboxes_db()) as c:
        r = c.get("/api/mailboxes/availability?localpart=whatever")
        assert r.status_code == 200
        assert r.json() == {
            "localpart": "whatever",
            "available": None,
            "reason": "unavailable",
        }


def test_availability_rate_limited() -> None:
    settings = get_settings()
    stub = FakeRedis()
    provisioner = FakeProvisioner(free=True)
    with _client_with(provisioner, stub, _no_mailboxes_db()) as c:
        for _ in range(settings.mail_username_check_limit):
            assert c.get("/api/mailboxes/availability?localpart=x").status_code == 200
        r = c.get("/api/mailboxes/availability?localpart=x")
        assert r.status_code == 429


# ── DB + Redis db-1 fixtures for infra tests ───────────────────────────────────


@pytest.fixture
def redis_db1() -> Generator[Redis, None, None]:
    r = Redis.from_url(REDIS_TEST_URL, decode_responses=True)
    r.flushdb()
    yield r
    r.flushdb()


@pytest.fixture
def db() -> Generator[Session, None, None]:
    engine = create_engine(PG_DSN.replace("postgresql://", "postgresql+psycopg://"))
    factory = sessionmaker(bind=engine, future=True)
    session = factory()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def mail_client(
    redis_db1: Redis,
) -> Generator[tuple[TestClient, Redis], None, None]:
    app.dependency_overrides[get_redis] = lambda: redis_db1
    yield TestClient(app), redis_db1
    app.dependency_overrides.clear()


def _delete_user(email: str | None) -> None:
    assert email
    with psycopg.connect(PG_DSN) as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (email,))


def _mailbox_row(localpart: str) -> dict[str, Any] | None:
    with psycopg.connect(PG_DSN) as conn:
        row = conn.execute(
            "SELECT id::text, user_id::text, localpart, status, quota_mb,"
            " mail_secret, attempts, provisioned_at, last_error"
            " FROM mailboxes WHERE localpart = %s",
            (localpart,),
        ).fetchone()
    if row is None:
        return None
    cols = [
        "id",
        "user_id",
        "localpart",
        "status",
        "quota_mb",
        "mail_secret",
        "attempts",
        "provisioned_at",
        "last_error",
    ]
    return dict(zip(cols, row, strict=True))


def _register_payload(email: str, **kw: Any) -> dict[str, Any]:
    return {
        "email": email,
        "password": "student-pass-123",
        "full_name": "QA Student",
        **kw,
    }


# ── Signup wiring (infra) ──────────────────────────────────────────────────────


@requires_infra
def test_register_with_mailbox_enqueues_job(
    mail_client: tuple[TestClient, Redis],
) -> None:
    c, redis_db1 = mail_client
    email = f"qa-{uuid.uuid4().hex[:8]}@example.dev"
    try:
        r = c.post(
            "/api/auth/register",
            json=_register_payload(
                email, mail_localpart="R.Sharma", mail_password="mailbox-pass-99"
            ),
        )
        assert r.status_code == 201, r.text
        row = _mailbox_row("r.sharma")  # normalized to lowercase
        assert row is not None
        assert row["status"] == "queued"
        assert row["quota_mb"] == get_settings().mail_default_quota_mb
        # Only the argon2id hash is stored — plaintext never persists.
        assert row["mail_secret"].startswith("$argon2id$")
        assert "mailbox-pass-99" not in row["mail_secret"]
        # Job payload carries the row id only — no secrets in Redis.
        jobs = redis_db1.lrange(mail_jobs.QUEUE_READY, 0, -1)
        assert len(jobs) == 1
        payload = json.loads(jobs[0])
        assert payload["mailbox_id"] == row["id"]
        assert "mail_secret" not in payload and "password" not in payload
    finally:
        _delete_user(email)


@requires_infra
def test_register_without_mailbox_is_unchanged(
    mail_client: tuple[TestClient, Redis],
) -> None:
    c, redis_db1 = mail_client
    email = f"qa-{uuid.uuid4().hex[:8]}@example.dev"
    try:
        r = c.post("/api/auth/register", json=_register_payload(email))
        assert r.status_code == 201
        assert redis_db1.lrange(mail_jobs.QUEUE_READY, 0, -1) == []
    finally:
        _delete_user(email)


@requires_infra
def test_register_mailbox_edge_cases(mail_client: tuple[TestClient, Redis]) -> None:
    c, _ = mail_client
    # Unpaired fields → 422
    assert (
        c.post(
            "/api/auth/register",
            json=_register_payload(
                f"qa-{uuid.uuid4().hex[:8]}@example.dev", mail_localpart="solo"
            ),
        ).status_code
        == 422
    )
    # Reserved/invalid localpart → 422
    for bad in ["postmaster", "a..b", "-lead"]:
        r = c.post(
            "/api/auth/register",
            json=_register_payload(
                f"qa-{uuid.uuid4().hex[:8]}@example.dev",
                mail_localpart=bad,
                mail_password="mailbox-pass-99",
            ),
        )
        assert r.status_code == 422, bad


@requires_infra
def test_register_duplicate_localpart_conflicts(
    mail_client: tuple[TestClient, Redis],
) -> None:
    c, _ = mail_client
    e1 = f"qa-{uuid.uuid4().hex[:8]}@example.dev"
    e2 = f"qa-{uuid.uuid4().hex[:8]}@example.dev"
    try:
        r1 = c.post(
            "/api/auth/register",
            json=_register_payload(
                e1, mail_localpart="taken.name", mail_password="mailbox-pass-99"
            ),
        )
        assert r1.status_code == 201
        r2 = c.post(
            "/api/auth/register",
            json=_register_payload(
                e2, mail_localpart="Taken.Name", mail_password="mailbox-pass-99"
            ),
        )
        assert r2.status_code == 409  # CITEXT — case-insensitive claim
    finally:
        _delete_user(e1)
        _delete_user(e2)


# ── Worker (infra) ─────────────────────────────────────────────────────────────


def _make_mailbox(
    db: Session, localpart: str | None = None, status: MailboxStatus = MailboxStatus.pending
) -> Mailbox:
    email = f"qa-{uuid.uuid4().hex[:8]}@example.dev"
    user = User(
        email=email,
        full_name="QA Student",
        password_hash="x",
        role=UserRole.student,
    )
    db.add(user)
    db.flush()
    box = Mailbox(
        user_id=user.id,
        localpart=localpart or f"box-{uuid.uuid4().hex[:8]}",
        status=status,
        quota_mb=1024,
        mail_secret="$argon2id$storedhash",
        attempts=0,
    )
    db.add(box)
    db.commit()
    return box



def _fresh(db: Session, box: Mailbox) -> Mailbox:
    db.expire_all()  # cross-session writes — reload, don't serve identity cache
    fresh = db.get(Mailbox, box.id)
    assert fresh is not None
    return fresh

class RecordingProvisioner(mail_api.NullProvisioner):
    def __init__(self, outcomes: list[Any]) -> None:
        self.outcomes = outcomes
        self.calls: list[dict[str, Any]] = []

    def create_mailbox(
        self,
        localpart: str,
        secret: str,
        quota_mb: int,
        display_name: str | None = None,
    ) -> Any:
        self.calls.append(
            {
                "localpart": localpart,
                "secret": secret,
                "quota_mb": quota_mb,
                "display_name": display_name,
            }
        )
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@requires_infra
def test_worker_success_marks_active_and_clears_secret(
    db: Session, redis_db1: Redis
) -> None:
    box = _make_mailbox(db)
    prov = RecordingProvisioner([mail_api.MailboxInfo(box.localpart, "a@b.c", "active", 1024)])
    mail_jobs.process_job(db, redis_db1, prov, {"mailbox_id": str(box.id)})
    box = _fresh(db, box)
    assert box.status == MailboxStatus.active
    assert box.mail_secret is None  # cleared post-provisioning
    assert box.provisioned_at is not None
    assert prov.calls[0]["localpart"] == box.localpart
    assert prov.calls[0]["secret"] == "$argon2id$storedhash"
    _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))


@requires_infra
def test_worker_retryable_failure_schedules_retry(
    db: Session, redis_db1: Redis
) -> None:
    box = _make_mailbox(db)
    prov = RecordingProvisioner([MailUnavailableError("stalwart down")])
    mail_jobs.process_job(db, redis_db1, prov, {"mailbox_id": str(box.id)})
    box = _fresh(db, box)
    assert box.status == MailboxStatus.queued
    assert box.attempts == 1
    assert "unavailable" in (box.last_error or "")
    # Scheduled in the retry ZSET with a future score (backoff).
    due = redis_db1.zrange(mail_jobs.QUEUE_RETRY, 0, -1, withscores=True)
    assert len(due) == 1
    assert float(due[0][1]) > mail_jobs.utcnow_ts()

    # Now the provider recovers — the promoted job converges to active.
    prov.outcomes.append(mail_api.MailboxInfo(box.localpart, "a@b.c", "active", 1024))
    mail_jobs.promote_due(redis_db1, now=float(due[0][1]) + 1)
    job = mail_jobs.pop_ready(redis_db1, timeout=1)
    assert job is not None
    mail_jobs.process_job(db, redis_db1, prov, job)
    box = _fresh(db, box)
    assert box.status == MailboxStatus.active
    _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))


@requires_infra
def test_worker_nonretryable_and_max_attempts_fail(
    db: Session, redis_db1: Redis
) -> None:
    box = _make_mailbox(db)
    prov = RecordingProvisioner([mail_api.MailInvalidRequestError("bad shape")])
    mail_jobs.process_job(db, redis_db1, prov, {"mailbox_id": str(box.id)})
    box = _fresh(db, box)
    assert box.status == MailboxStatus.failed
    assert box.mail_secret is None  # purged on terminal failure (TEC-187)
    assert redis_db1.zrange(mail_jobs.QUEUE_RETRY, 0, -1) == []

    box2 = _make_mailbox(db, status=MailboxStatus.queued)
    box2.attempts = get_settings().mail_provision_max_attempts - 1
    db.commit()
    prov = RecordingProvisioner([MailUnavailableError("still down")])
    mail_jobs.process_job(db, redis_db1, prov, {"mailbox_id": str(box2.id)})
    box2 = _fresh(db, box2)
    assert box2.status == MailboxStatus.failed  # attempts exhausted
    assert box2.mail_secret is None
    for b in (box, box2):
        _delete_user(db.scalar(select(User.email).where(User.id == b.user_id)))


@requires_infra
def test_worker_missing_secret_fails_fast(db: Session, redis_db1: Redis) -> None:
    box = _make_mailbox(db)
    box.mail_secret = None
    db.commit()
    prov = RecordingProvisioner([])
    mail_jobs.process_job(db, redis_db1, prov, {"mailbox_id": str(box.id)})
    box = _fresh(db, box)
    assert box.status == MailboxStatus.failed
    assert prov.calls == []
    _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))


@requires_infra
def test_sweeper_rescues_stuck_rows(db: Session, redis_db1: Redis) -> None:
    box = _make_mailbox(db, status=MailboxStatus.pending)
    with psycopg.connect(PG_DSN) as conn:
        conn.execute(
            "UPDATE mailboxes SET updated_at = %s WHERE id = %s",
            (datetime.now(UTC) - timedelta(minutes=5), str(box.id)),
        )
    rescued = mail_jobs.sweep_stale(db, redis_db1)
    assert rescued == 1
    box = _fresh(db, box)
    assert box.status == MailboxStatus.queued
    assert redis_db1.llen(mail_jobs.QUEUE_READY) == 1
    _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))


# ── Admin endpoints (infra) ────────────────────────────────────────────────────


def _admin_headers(db: Session) -> dict[str, str]:
    admin = User(
        email=f"qa-admin-{uuid.uuid4().hex[:8]}@example.dev",
        full_name="QA Admin",
        password_hash="x",
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    token, _ = create_access_token(admin.id, UserRole.admin)
    return {"Authorization": f"Bearer {token}", "x-admin-id": str(admin.id)}


@requires_infra
def test_admin_mailbox_list_detail_and_retry(
    db: Session, redis_db1: Redis
) -> None:
    box = _make_mailbox(db, status=MailboxStatus.failed)
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _client_with(FakeProvisioner(), redis_db1) as c:
            r = c.get("/api/admin/mailboxes", headers=headers)
            assert r.status_code == 200
            body = r.json()
            assert any(i["id"] == str(box.id) for i in body["items"])
            item = next(i for i in body["items"] if i["id"] == str(box.id))
            assert item["address"].endswith("@bloomieltsacademy.com")
            assert item["status"] == "failed"

            r = c.get(f"/api/admin/mailboxes/{box.id}", headers=headers)
            assert r.status_code == 200

            r = c.post(f"/api/admin/mailboxes/{box.id}/retry", headers=headers)
            assert r.status_code == 200
            box = _fresh(db, box)
            assert box.status == MailboxStatus.queued
            assert box.attempts == 0
            assert redis_db1.llen(mail_jobs.QUEUE_READY) == 1

            # retry on an active row → 409
            box.status = MailboxStatus.active
            db.commit()
            r = c.post(f"/api/admin/mailboxes/{box.id}/retry", headers=headers)
            assert r.status_code == 409
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_retry_failed_requires_fresh_password(
    db: Session, redis_db1: Redis
) -> None:
    """TEC-187: failed rows carry no secret — retry must supply mail_password."""
    box = _make_mailbox(db, status=MailboxStatus.failed)
    box.mail_secret = None  # post-TEC-187 failed shape — secret purged
    db.commit()
    headers = _admin_headers(db)
    admin_id = headers.pop("x-admin-id")
    try:
        with _client_with(FakeProvisioner(), redis_db1) as c:
            # No stored secret and no password in the body → 409.
            r = c.post(f"/api/admin/mailboxes/{box.id}/retry", headers=headers)
            assert r.status_code == 409

            # Fresh password re-enters the flow: re-hashed and queued.
            r = c.post(
                f"/api/admin/mailboxes/{box.id}/retry",
                headers=headers,
                json={"mail_password": "fresh-pass-123"},
            )
            assert r.status_code == 200, r.text
            box = _fresh(db, box)
            assert box.status == MailboxStatus.queued
            assert box.attempts == 0
            assert box.mail_secret is not None
            assert box.mail_secret.startswith("$argon2id$")
            assert "fresh-pass-123" not in box.mail_secret
            assert verify_password("fresh-pass-123", box.mail_secret)
            assert redis_db1.llen(mail_jobs.QUEUE_READY) == 1

            # Password validation happens at the schema boundary.
            box.status = MailboxStatus.failed
            box.mail_secret = None
            db.commit()
            r = c.post(
                f"/api/admin/mailboxes/{box.id}/retry",
                headers=headers,
                json={"mail_password": "short"},
            )
            assert r.status_code == 422
    finally:
        _delete_user(db.scalar(select(User.email).where(User.id == box.user_id)))
        _delete_user(db.scalar(select(User.email).where(User.id == uuid.UUID(admin_id))))


@requires_infra
def test_admin_mailboxes_requires_admin(db: Session, redis_db1: Redis) -> None:
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
        r = client.get(
            "/api/admin/mailboxes", headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 403
        assert client.get("/api/admin/mailboxes").status_code == 401
    finally:
        _delete_user(student.email)
