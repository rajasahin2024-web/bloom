"""Tests for the auth hardening in TEC-153.

HIGH-2 — POST /api/auth/login rate limiting: fixed-window Redis counters per
caller IP and per target email; a generic 429 once either trips.
HIGH-3 — JWT secret guard: outside development/test the app refuses to issue
or verify tokens while JWT_SECRET is still the built-in dev default.

Rate-limit unit tests run hermetically through a minimal in-memory Redis
stub injected via the `get_redis` dependency override (the limiter fires
before the DB is queried, so no Postgres is needed); the end-to-end case is
marked `requires_infra` like the other integration tests.
"""

from __future__ import annotations

import logging
import socket
import uuid
from collections.abc import Generator
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.redis import get_redis
from app.core.security import create_access_token, decode_access_token
from app.main import app, create_app
from app.models.enums import UserRole

client = TestClient(app)

PG_HOST = "localhost"
PG_PORT = 5433
REDIS_URL = "redis://localhost:6380/0"
PG_DSN = "postgresql://bloom:bloom_dev_password@localhost:5433/bloom"


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        socket.create_connection(("localhost", 6380), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(not _infra_up(), reason="local docker stack is not running")


# ── in-memory Redis stub ─────────────────────────────────────────────────


class _FakePipeline:
    """Just enough pipeline for rate_limit.hit: set(..., nx, ex) + incr."""

    def __init__(self, store: dict[str, int]) -> None:
        self._store = store
        self._ops: list[tuple[Any, ...]] = []

    def set(self, key: str, value: int, ex: int | None = None, nx: bool = False) -> _FakePipeline:
        self._ops.append(("set", key, value, nx))
        return self

    def incr(self, key: str) -> _FakePipeline:
        self._ops.append(("incr", key))
        return self

    def execute(self) -> list[Any]:
        out: list[Any] = []
        for op in self._ops:
            if op[0] == "set":
                _, key, value, nx = op
                if nx and key in self._store:
                    out.append(False)
                else:
                    self._store[key] = value
                    out.append(True)
            else:  # incr
                self._store[op[1]] = int(self._store.get(op[1], 0)) + 1
                out.append(self._store[op[1]])
        return out


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, int] = {}

    def pipeline(self) -> _FakePipeline:
        return _FakePipeline(self.store)


@pytest.fixture
def fake_redis() -> Generator[_FakeRedis, None, None]:
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    try:
        yield fake
    finally:
        app.dependency_overrides.clear()


def _login(email: str, password: str = "wrong-password") -> Any:
    return client.post("/api/auth/login", json={"email": email, "password": password})


# ── HIGH-2: login rate limiting ──────────────────────────────────────────


def test_sixth_login_attempt_returns_429(fake_redis: _FakeRedis) -> None:
    email = f"rl-{uuid.uuid4()}@example.dev"
    for _ in range(5):
        assert _login(email).status_code != 429  # reached credential check
    response = _login(email)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "300"
    # denied attempts still count — the counter can't be bypassed by retrying
    assert fake_redis.store[f"rl:login:email:{email}"] == 6
    assert fake_redis.store["rl:login:ip:testclient"] == 6


def test_429_detail_is_generic_across_buckets(
    fake_redis: _FakeRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = f"rl-{uuid.uuid4()}@example.dev"
    for _ in range(5):
        _login(email)
    email_blocked = _login(email)
    assert email_blocked.status_code == 429

    # Trip the IP bucket with a fresh email — the detail must not reveal
    # which bucket fired.
    monkeypatch.setattr(get_settings(), "login_rate_limit_ip", 1)
    _login(f"other-{uuid.uuid4()}@example.dev")
    ip_blocked = _login(f"third-{uuid.uuid4()}@example.dev")
    assert ip_blocked.status_code == 429
    assert ip_blocked.json()["detail"] == email_blocked.json()["detail"]
    assert email not in ip_blocked.json()["detail"]


def test_ip_bucket_applies_across_emails(
    fake_redis: _FakeRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "login_rate_limit_ip", 3)
    for _ in range(3):
        response = _login(f"ip-{uuid.uuid4()}@example.dev")
        assert response.status_code != 429
    assert _login(f"ip-{uuid.uuid4()}@example.dev").status_code == 429


def test_login_503_when_redis_unavailable() -> None:
    """Fail closed: the limiter must not silently disable itself."""

    class _DeadRedis:
        def pipeline(self) -> Any:
            raise RedisError("connection refused")

    app.dependency_overrides[get_redis] = lambda: _DeadRedis()
    try:
        assert _login(f"dead-{uuid.uuid4()}@example.dev").status_code == 503
    finally:
        app.dependency_overrides.clear()


@requires_infra
def test_login_rate_limit_end_to_end() -> None:
    """Real stack: 5x401 then 429, and the counter key carries the window TTL."""
    redis = Redis.from_url(REDIS_URL, decode_responses=True)
    email = f"rl-e2e-{uuid.uuid4()}@example.dev"
    try:
        for _ in range(5):
            assert _login(email).status_code == 401
        assert _login(email).status_code == 429
        ttl = redis.ttl(f"rl:login:email:{email}")
        assert 0 < ttl <= 300
    finally:
        redis.delete(f"rl:login:email:{email}", "rl:login:ip:testclient")
        redis.close()


@requires_infra
def test_successful_logins_still_consume_budget() -> None:
    """A correct password does not bypass the limiter — attempts count."""
    email = f"rl-ok-{uuid.uuid4()}@example.dev"
    password = "correct-horse-42"
    registered = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "RL Test"},
    )
    assert registered.status_code == 201
    redis = Redis.from_url(REDIS_URL, decode_responses=True)
    try:
        for _ in range(5):
            response = _login(email, password)
            assert response.status_code == 200
            assert response.json()["tokens"]["access_token"]
        assert _login(email, password).status_code == 429
    finally:
        redis.delete(f"rl:login:email:{email}", "rl:login:ip:testclient")
        redis.close()
        with psycopg.connect(PG_DSN) as conn:
            conn.execute("DELETE FROM users WHERE email = %s", (email,))


# ── HIGH-3: JWT secret boot/token guard ──────────────────────────────────


def test_production_default_secret_refuses_token_issue(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(get_settings(), "api_env", "production")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        create_access_token(uuid.uuid4(), UserRole.admin)


def test_production_default_secret_refuses_token_verify(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Signed while the dev secret is still permitted (API_ENV=test), then the
    # env flips — the token must become unverifiable, forged or not.
    token, _ = create_access_token(uuid.uuid4(), UserRole.admin)
    monkeypatch.setattr(get_settings(), "api_env", "production")
    assert decode_access_token(token) is None


@pytest.mark.parametrize("env", ["development", "test"])
def test_dev_and_test_permit_dev_secret(monkeypatch: pytest.MonkeyPatch, env: str) -> None:
    monkeypatch.setattr(get_settings(), "api_env", env)
    token, _ = create_access_token(uuid.uuid4(), UserRole.student)
    claims = decode_access_token(token)
    assert claims is not None
    assert claims["role"] == "student"


# ── MEDIUM-2: refresh token moves to an HttpOnly cookie ─────────────────
#
# The JSON contract is unchanged — login/register still return the token
# pair — but also Set-Cookie `bloom_refresh` scoped to /api/auth. Browsers
# then refresh/logout with an empty body; body transport keeps working for
# non-browser clients.


def _register(email: str, password: str = "correct-horse-42") -> Any:
    return TestClient(app).post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Cookie Test"},
    )


def _delete_user(email: str) -> None:
    with psycopg.connect(PG_DSN) as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (email,))


@requires_infra
def test_register_and_login_set_httponly_refresh_cookie() -> None:
    email = f"ck-{uuid.uuid4()}@example.dev"
    try:
        jar = TestClient(app)
        registered = jar.post(
            "/api/auth/register",
            json={"email": email, "password": "correct-horse-42", "full_name": "CK"},
        )
        assert registered.status_code == 201
        cookie = registered.headers["set-cookie"]
        assert "bloom_refresh=" in cookie
        assert "httponly" in cookie.lower()
        assert "samesite=strict" in cookie.lower()
        assert "path=/api/auth" in cookie.lower()
        assert f"max-age={30 * 86400}" in cookie.lower()

        # A fresh jar still gets the cookie on login (JSON contract intact).
        fresh = TestClient(app)
        logged_in = fresh.post(
            "/api/auth/login", json={"email": email, "password": "correct-horse-42"}
        )
        assert logged_in.status_code == 200
        assert logged_in.json()["tokens"]["refresh_token"]
        assert "bloom_refresh=" in logged_in.headers["set-cookie"]
    finally:
        _delete_user(email)


@requires_infra
def test_refresh_via_cookie_rotates_and_returns_access_only() -> None:
    email = f"ck-{uuid.uuid4()}@example.dev"
    try:
        jar = TestClient(app)
        registered = jar.post(
            "/api/auth/register",
            json={"email": email, "password": "correct-horse-42", "full_name": "CK"},
        )
        original = jar.cookies.get("bloom_refresh")
        assert original == registered.json()["tokens"]["refresh_token"]

        # Empty JSON body — the cookie carries the credential.
        rotated = jar.post("/api/auth/refresh", json={})
        assert rotated.status_code == 200
        body = rotated.json()
        assert body["access_token"]
        assert body["expires_in"] > 0
        assert "refresh_token" not in body  # cookie path never re-ships it

        new_cookie = jar.cookies.get("bloom_refresh")
        assert new_cookie and new_cookie != original

        # The rotated-out token is revoked — replaying it must fail.
        replay = TestClient(app)
        replay.cookies.set("bloom_refresh", original, path="/api/auth")
        assert replay.post("/api/auth/refresh", json={}).status_code == 401
    finally:
        _delete_user(email)


@requires_infra
def test_refresh_via_body_returns_full_pair_for_non_browser_clients() -> None:
    email = f"ck-{uuid.uuid4()}@example.dev"
    try:
        registered = _register(email)
        refresh_token = registered.json()["tokens"]["refresh_token"]

        # No cookie on this client — body transport only.
        rotated = TestClient(app).post(
            "/api/auth/refresh", json={"refresh_token": refresh_token}
        )
        assert rotated.status_code == 200
        pair = rotated.json()
        assert pair["refresh_token"] and pair["refresh_token"] != refresh_token

        # Body path must not silently accept the old token twice either.
        assert (
            TestClient(app)
            .post("/api/auth/refresh", json={"refresh_token": refresh_token})
            .status_code
            == 401
        )
    finally:
        _delete_user(email)


@requires_infra
def test_refresh_without_any_credential_returns_401() -> None:
    assert TestClient(app).post("/api/auth/refresh", json={}).status_code == 401
    assert TestClient(app).post("/api/auth/refresh").status_code == 401


@requires_infra
def test_logout_via_cookie_revokes_and_clears_cookie() -> None:
    email = f"ck-{uuid.uuid4()}@example.dev"
    try:
        jar = TestClient(app)
        jar.post(
            "/api/auth/register",
            json={"email": email, "password": "correct-horse-42", "full_name": "CK"},
        )
        assert jar.cookies.get("bloom_refresh")

        out = jar.post("/api/auth/logout", json={})
        assert out.status_code == 204
        cleared = out.headers["set-cookie"]
        assert "bloom_refresh=" in cleared
        assert "max-age=0" in cleared.lower()

        # The revoked token no longer refreshes, cookie or body.
        assert jar.post("/api/auth/refresh", json={}).status_code == 401
    finally:
        _delete_user(email)


@requires_infra
def test_logout_via_body_still_works_and_logout_is_idempotent() -> None:
    email = f"ck-{uuid.uuid4()}@example.dev"
    try:
        registered = _register(email)
        refresh_token = registered.json()["tokens"]["refresh_token"]

        bare = TestClient(app)
        assert (
            bare.post("/api/auth/logout", json={"refresh_token": refresh_token}).status_code
            == 204
        )
        assert (
            bare.post("/api/auth/refresh", json={"refresh_token": refresh_token}).status_code
            == 401
        )
        # Unknown tokens are a no-op — still 204.
        assert (
            bare.post("/api/auth/logout", json={"refresh_token": "nope"}).status_code == 204
        )
    finally:
        _delete_user(email)


def test_production_with_real_secret_issues_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "api_env", "production")
    monkeypatch.setattr(settings, "jwt_secret", f"real-{uuid.uuid4().hex}")
    token, _ = create_access_token(uuid.uuid4(), UserRole.admin)
    assert decode_access_token(token) is not None


def test_boot_logs_critical_when_secret_insecure(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr(get_settings(), "api_env", "production")
    with caplog.at_level(logging.CRITICAL):
        create_app()
    assert any("JWT_SECRET" in record.message for record in caplog.records)
