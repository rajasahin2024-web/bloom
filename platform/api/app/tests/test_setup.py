"""Tests for the first-run setup wizard API (`/api/setup/*`).

Unit tests run hermetically against a scratch env file. Integration tests are
skipped unless the local docker stack is reachable (Postgres :5433,
PgBouncer :6432, Redis :6380).
"""

from __future__ import annotations

import os
import socket
from collections.abc import Generator
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import bootstrap
from app.core.config import get_settings
from app.main import app
from app.services import setup as setup_service

client = TestClient(app)

# Local docker-stack coordinates (platform/docker-compose.yml port mappings).
PG_HOST = "localhost"
PG_PORT = 5433
PGB_PORT = 6432
REDIS_PORT = 6380
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"

_APPLY_ENV_KEYS = (
    "DATABASE_URL",
    "DATABASE_URL_DIRECT",
    "JWT_SECRET",
    "SETUP_COMPLETE",
    "REDIS_URL",
    "INSTITUTE_NAME",
    "INSTITUTE_TAGLINE",
    "INSTITUTE_LOGO_URL",
    "SEED_ADMIN_EMAIL",
    "SEED_ADMIN_NAME",
    "SEED_ADMIN_PASSWORD",
)


@pytest.fixture
def scratch_env(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Generator[Path, None, None]:
    """Point the wizard at a scratch env file and reset applied state.

    Restores os.environ keys that a successful apply stages, so later tests
    are unaffected by the in-process configured flag.
    """
    env_file = tmp_path / ".env"
    monkeypatch.setattr(setup_service, "ENV_FILE_PATH", env_file)
    monkeypatch.setattr(setup_service, "_applied", False)
    saved = {key: os.environ.get(key) for key in _APPLY_ENV_KEYS}
    yield env_file
    for key, value in saved.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    get_settings.cache_clear()
    setup_service._applied = False


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


# ── status + self-lock ───────────────────────────────────────────────────


def test_status_unconfigured(scratch_env: Path) -> None:
    response = client.get("/api/setup/status")
    assert response.status_code == 200
    assert response.json() == {"configured": False}


def test_all_endpoints_lock_once_configured(scratch_env: Path) -> None:
    scratch_env.write_text("SETUP_COMPLETE=true\n")
    calls = [
        ("GET", "/api/setup/status", None),
        (
            "POST",
            "/api/setup/test-database",
            {"host": "x", "port": 1, "database": "x", "username": "x", "password": "x"},
        ),
        ("POST", "/api/setup/test-redis", {"host": "x", "port": 1}),
        (
            "POST",
            "/api/setup/apply",
            {
                "database": {
                    "host": "x",
                    "port": 1,
                    "database": "x",
                    "username": "x",
                    "password": "x",
                },
                "redis": None,
                "admin_email": "a@b.co",
                "admin_password": "password123",
                "admin_name": "A",
                "institute_name": "Test Institute",
            },
        ),
    ]
    for method, path, body in calls:
        response = client.request(method, path, json=body)
        assert response.status_code == 410, f"{method} {path} should be locked"


# ── branding (readable after lock, unlike /api/setup/*) ──────────────────


def test_branding_endpoint_shape(scratch_env: Path) -> None:
    response = client.get("/api/branding")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"name", "tagline", "logo_url"}


def test_branding_still_served_after_lock(scratch_env: Path) -> None:
    scratch_env.write_text("SETUP_COMPLETE=true\n")
    assert client.get("/api/setup/status").status_code == 410
    response = client.get("/api/branding")
    assert response.status_code == 200


def test_branding_logo_404_when_none(
    scratch_env: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", scratch_env.parent / "nope")
    assert client.get("/api/branding/logo").status_code == 404


def test_save_logo_rejects_bad_input(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    with pytest.raises(ValueError):
        setup_service._save_logo("data:text/html;base64,PGI+aGk8L2I+")
    with pytest.raises(ValueError):
        setup_service._save_logo("not-a-data-url")


# ── test-database ────────────────────────────────────────────────────────


def test_test_database_unreachable(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-database",
        json={
            "host": "127.0.0.1",
            "port": 1,
            "database": "bloom",
            "username": "bloom",
            "password": "x",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert body["checks"][0]["name"] == "tcp"
    assert body["checks"][0]["ok"] is False
    assert body["error"]
    assert body["hint"]


@requires_infra
def test_test_database_direct_success(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-database",
        json={
            "host": PG_HOST,
            "port": PG_PORT,
            "database": PG_DB,
            "username": PG_USER,
            "password": PG_PASSWORD,
            "connection_type": "direct",
        },
    )
    body = response.json()
    assert body["ok"] is True
    assert body["pgvector_installed"] is True
    assert "PostgreSQL" in body["postgres_version"]
    assert body["pgbouncer_detected"] is False


@requires_infra
def test_test_database_pgbouncer_detected(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-database",
        json={
            "host": PG_HOST,
            "port": PGB_PORT,
            "database": PG_DB,
            "username": PG_USER,
            "password": PG_PASSWORD,
            "connection_type": "pgbouncer",
        },
    )
    body = response.json()
    assert body["ok"] is True
    assert body["pgbouncer_detected"] is True
    assert "transaction" in (body["hint"] or "").lower()


@requires_infra
def test_test_database_bad_credentials(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-database",
        json={
            "host": PG_HOST,
            "port": PG_PORT,
            "database": PG_DB,
            "username": PG_USER,
            "password": "definitely-wrong",
            "connection_type": "direct",
        },
    )
    body = response.json()
    assert body["ok"] is False
    # connect-time errors arrive with sqlstate=None, so this asserts the
    # message-text classification in _classify_connect_error really fires
    assert body["error"] == (
        "Authentication failed — the username or password was rejected."
    )
    assert body["hint"] == "Double-check the database username and password."


@requires_infra
def test_test_database_missing_database(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-database",
        json={
            "host": PG_HOST,
            "port": PG_PORT,
            "database": "bloom_missing_db",
            "username": PG_USER,
            "password": PG_PASSWORD,
            "connection_type": "direct",
        },
    )
    body = response.json()
    assert body["ok"] is False
    assert body["error"] == (
        'Database "bloom_missing_db" does not exist on this server.'
    )
    assert body["hint"] == "Create the database first, or fix the database name."


# ── connect-error classification ─────────────────────────────────────────


def _connect_error(message: str) -> psycopg.OperationalError:
    """Connect-time failure shape: OperationalError with sqlstate=None."""
    return psycopg.OperationalError(message)


def test_classify_connect_error_password_auth() -> None:
    exc = _connect_error(
        'connection failed: connection to server at "127.0.0.1", port 5433 '
        'failed: FATAL:  password authentication failed for user "bloom"'
    )
    error, hint = setup_service._classify_connect_error(exc, "bloom")
    assert error == "Authentication failed — the username or password was rejected."
    assert hint == "Double-check the database username and password."


def test_classify_connect_error_missing_database() -> None:
    exc = _connect_error(
        'connection failed: connection to server at "127.0.0.1", port 5433 '
        'failed: FATAL:  database "nope" does not exist'
    )
    error, hint = setup_service._classify_connect_error(exc, "nope")
    assert error == 'Database "nope" does not exist on this server.'
    assert hint == "Create the database first, or fix the database name."


def test_classify_connect_error_pg_hba() -> None:
    exc = _connect_error(
        'connection failed: connection to server at "10.0.0.5", port 5432 '
        'failed: FATAL:  no pg_hba.conf entry for host "10.0.0.9", user '
        '"bloom", database "bloom", no encryption'
    )
    error, hint = setup_service._classify_connect_error(exc, "bloom")
    assert "pg_hba" in error
    assert "pg_hba.conf" in hint


def test_classify_connect_error_sqlstate_still_wins() -> None:
    exc = _connect_error("anything")
    exc.sqlstate = "3D000"
    error, _ = setup_service._classify_connect_error(exc, "gone")
    assert error == 'Database "gone" does not exist on this server.'


def test_classify_connect_error_generic_strips_libpq_wrapper() -> None:
    exc = _connect_error(
        'connection failed: connection to server at "h", port 5432 '
        "failed: FATAL:  sorry, too many clients already"
    )
    error, hint = setup_service._classify_connect_error(exc, "bloom")
    assert error == "FATAL:  sorry, too many clients already"
    assert hint == "Check the connection details and try again."


# ── test-redis ───────────────────────────────────────────────────────────


def test_test_redis_unreachable(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-redis", json={"host": "127.0.0.1", "port": 1, "password": None}
    )
    assert response.status_code == 200
    assert response.json()["ok"] is False


@requires_infra
def test_test_redis_success(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/test-redis", json={"host": PG_HOST, "port": REDIS_PORT, "password": None}
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True, "error": None}


# ── apply ────────────────────────────────────────────────────────────────


def test_apply_fails_when_db_unreachable(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/apply",
        json={
            "database": {
                "host": "127.0.0.1",
                "port": 1,
                "database": "bloom",
                "username": "bloom",
                "password": "x",
                "connection_type": "direct",
            },
            "redis": None,
            "admin_email": "admin@techfly.dev",
            "admin_password": "password123",
            "admin_name": "Setup Admin",
            "institute_name": "Techfly IELTS",
        },
    )
    body = response.json()
    assert body.get("ok") is False, body
    assert body["configured"] is False
    assert body["error"]
    # failed apply must not write the env file or lock the wizard
    assert not scratch_env.exists()
    assert client.get("/api/setup/status").json() == {"configured": False}


def test_apply_requires_institute_name(scratch_env: Path) -> None:
    response = client.post(
        "/api/setup/apply",
        json={
            "database": {
                "host": "127.0.0.1",
                "port": 1,
                "database": "bloom",
                "username": "bloom",
                "password": "x",
            },
            "redis": None,
            "admin_email": "admin@techfly.dev",
            "admin_password": "password123",
            "admin_name": "Setup Admin",
        },
    )
    assert response.status_code == 422


@requires_infra
def test_apply_end_to_end(scratch_env: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    uploads = scratch_env.parent / "uploads"
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", uploads)
    email = "setup-test-admin@techfly.dev"
    # 1x1 transparent PNG
    logo = (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
        "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )
    response = client.post(
        "/api/setup/apply",
        json={
            "database": {
                "host": PG_HOST,
                "port": PG_PORT,
                "database": PG_DB,
                "username": PG_USER,
                "password": PG_PASSWORD,
                "connection_type": "direct",
            },
            "redis": {"host": PG_HOST, "port": REDIS_PORT, "password": None},
            "admin_email": email,
            "admin_password": "password123",
            "admin_name": "Setup Test Admin",
            "institute_name": "Test IELTS Institute",
            "institute_tagline": "Band 7 or bust",
            "institute_logo": logo,
        },
    )
    body = response.json()
    try:
        assert body == {"ok": True, "configured": True, "error": None}
        # env file written with the required keys — including the deferred
        # SEED_ADMIN_* credentials the bootstrap consumes later
        content = scratch_env.read_text()
        for key in (
            "DATABASE_URL",
            "DATABASE_URL_DIRECT",
            "REDIS_URL",
            "JWT_SECRET",
            "SETUP_COMPLETE=true",
            'INSTITUTE_NAME="Test IELTS Institute"',
            'INSTITUTE_TAGLINE="Band 7 or bust"',
            "INSTITUTE_LOGO_URL=/api/branding/logo",
            f"SEED_ADMIN_EMAIL={email}",
            'SEED_ADMIN_NAME="Setup Test Admin"',
            "SEED_ADMIN_PASSWORD=password123",
        ):
            assert key in content
        # uploaded logo landed on disk and is served
        assert (uploads / "branding" / "logo.png").is_file()
        logo_resp = client.get("/api/branding/logo")
        assert logo_resp.status_code == 200
        assert logo_resp.headers["content-type"] == "image/png"
        # apply must not touch the database — no admin row yet
        conn = psycopg.connect(
            host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASSWORD
        )
        row = conn.execute(
            "SELECT role FROM users WHERE email = %s", (email,)
        ).fetchone()
        conn.close()
        assert row is None
        # wizard is now locked
        assert client.get("/api/setup/status").status_code == 410
        # ── later one-shot bootstrap: migrate + seed admin ──
        assert bootstrap.main() == 0
        conn = psycopg.connect(
            host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASSWORD
        )
        row = conn.execute(
            "SELECT role FROM users WHERE email = %s", (email,)
        ).fetchone()
        conn.close()
        assert row is not None and row[0] == "admin"
        # seed credentials were stripped from the env file after seeding
        assert "SEED_ADMIN" not in scratch_env.read_text()
    finally:
        # clean up the seeded admin row from the dev database
        conn = psycopg.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DB,
            user=PG_USER,
            password=PG_PASSWORD,
            autocommit=True,
        )
        conn.execute("DELETE FROM users WHERE email = %s", (email,))
        conn.close()


@requires_infra
def test_apply_admin_skipped(scratch_env: Path) -> None:
    """Apply succeeds with no admin fields and stores no SEED_ADMIN_* keys."""
    response = client.post(
        "/api/setup/apply",
        json={
            "database": {
                "host": PG_HOST,
                "port": PG_PORT,
                "database": PG_DB,
                "username": PG_USER,
                "password": PG_PASSWORD,
                "connection_type": "direct",
            },
            "redis": None,
            "institute_name": "Test IELTS Institute",
        },
    )
    assert response.json() == {"ok": True, "configured": True, "error": None}
    assert "SEED_ADMIN" not in scratch_env.read_text()


def test_apply_admin_partial_rejected(scratch_env: Path) -> None:
    """admin_* are all-or-none — a lone email must be a 422."""
    response = client.post(
        "/api/setup/apply",
        json={
            "database": {
                "host": "127.0.0.1",
                "port": 1,
                "database": "bloom",
                "username": "bloom",
                "password": "x",
            },
            "admin_email": "admin@techfly.dev",
            "institute_name": "Test IELTS Institute",
        },
    )
    assert response.status_code == 422
