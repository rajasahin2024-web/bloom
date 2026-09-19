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
            },
        ),
    ]
    for method, path, body in calls:
        response = client.request(method, path, json=body)
        assert response.status_code == 410, f"{method} {path} should be locked"


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
    assert "auth" in body["error"].lower() or "password" in body["error"].lower()
    assert body["hint"]


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
        },
    )
    body = response.json()
    assert body.get("ok") is False, body
    assert body["configured"] is False
    assert body["error"]
    # failed apply must not write the env file or lock the wizard
    assert not scratch_env.exists()
    assert client.get("/api/setup/status").json() == {"configured": False}


@requires_infra
def test_apply_end_to_end(scratch_env: Path) -> None:
    email = "setup-test-admin@techfly.dev"
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
        },
    )
    body = response.json()
    try:
        assert body == {"ok": True, "configured": True, "error": None}
        # env file written with the required keys
        content = scratch_env.read_text()
        for key in (
            "DATABASE_URL",
            "DATABASE_URL_DIRECT",
            "REDIS_URL",
            "JWT_SECRET",
            "SETUP_COMPLETE=true",
        ):
            assert key in content
        # admin row exists with role=admin
        conn = psycopg.connect(
            host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASSWORD
        )
        row = conn.execute(
            "SELECT role FROM users WHERE email = %s", (email,)
        ).fetchone()
        conn.close()
        assert row is not None and row[0] == "admin"
        # wizard is now locked
        assert client.get("/api/setup/status").status_code == 410
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
