"""Tests for the admin settings API (`/api/admin/settings`).

Unit tests cover the per-key validation rules hermetically. Integration
tests run against the local docker stack when it's up (same convention as
test_setup.py) — they create their own admin user and reset settings
afterwards.
"""

from __future__ import annotations

import socket
import uuid
from collections.abc import Generator
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.models.enums import UserRole
from app.services import settings as settings_service

client = TestClient(app)

# Local docker-stack coordinates (platform/docker-compose.yml port mappings).
PG_HOST = "localhost"
PG_PORT = 5433
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"

TEST_ADMIN_EMAIL = "settings-test-admin@techfly.dev"

_SPEC = {s.key: s for s in settings_service.SPECS}


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


def _validate(key: str, raw: object) -> dict[str, str]:
    """Run one key through the validator; returns {key: message} or {}."""
    errors: dict[str, str] = {}
    settings_service._validate(_SPEC[key], raw, errors)
    return errors


# ── per-key validation (hermetic) ────────────────────────────────────────


def test_band_select_accepts_full_range() -> None:
    for band in ("5.5", "7.0", "8.5", "9.0"):
        assert _validate("academic.default_target_band", band) == {}
    assert _validate("academic.default_target_band", "5.0")
    assert _validate("academic.default_target_band", "9.5")
    assert _validate("academic.default_target_band", 7.0)  # must be a string


def test_percent_option_lists() -> None:
    assert _validate("academic.min_attendance", "85%") == {}
    assert _validate("academic.min_attendance", "60%")
    assert _validate("finance.deposit", "Full fee") == {}
    assert _validate("finance.deposit", "75%")
    assert _validate("finance.grace_period", "30 days") == {}
    assert _validate("finance.grace_period", "45 days")


def test_email_and_url_validation() -> None:
    assert _validate("institute.contact_email", "hello@bloomielts.com") == {}
    assert _validate("institute.contact_email", "not-an-email")
    # empty is allowed (optional contact fields)
    assert _validate("institute.contact_email", "") == {}
    assert _validate("institute.website_url", "https://bloom.example") == {}
    assert _validate("institute.website_url", "bloom.example")


def test_toggle_requires_bool() -> None:
    assert _validate("finance.suspend_on_overdue", True) == {}
    assert _validate("finance.suspend_on_overdue", False) == {}
    assert _validate("finance.suspend_on_overdue", "true")
    assert _validate("finance.suspend_on_overdue", 1)


def test_tax_percent_range() -> None:
    assert _validate("finance.tax_percent", 0) == {}
    assert _validate("finance.tax_percent", 18) == {}
    assert _validate("finance.tax_percent", 101)
    assert _validate("finance.tax_percent", "18")


def test_registry_covers_all_groups() -> None:
    groups = {s.group for s in settings_service.SPECS}
    assert groups == {"institute", "academic", "finance", "notifications"}
    # every key is unique
    keys = [s.key for s in settings_service.SPECS]
    assert len(keys) == len(set(keys))


# ── auth guard ───────────────────────────────────────────────────────────


def test_get_requires_auth() -> None:
    assert client.get("/api/admin/settings").status_code == 401
    assert client.patch("/api/admin/settings", json={}).status_code == 401
    assert client.post("/api/admin/settings/reset").status_code == 401


# ── live round-trip against the docker stack ─────────────────────────────


def _pg() -> psycopg.Connection[object]:
    return psycopg.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASSWORD,
        autocommit=True,
    )


@pytest.fixture
def admin_token() -> Generator[str, None, None]:
    """A real admin row + signed token; cleaned up after the test."""
    user_id = str(uuid.uuid4())
    conn = _pg()
    conn.execute(
        "INSERT INTO users (id, email, full_name, role, is_active, created_at,"
        " updated_at) VALUES (%s, %s, 'Settings Test Admin', 'admin', true,"
        " %s, %s)",
        (user_id, TEST_ADMIN_EMAIL, datetime.now(UTC), datetime.now(UTC)),
    )
    conn.close()
    token, _ = create_access_token(uuid.UUID(user_id), UserRole.admin)
    yield token
    conn = _pg()
    conn.execute("DELETE FROM users WHERE email = %s", (TEST_ADMIN_EMAIL,))
    conn.close()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@requires_infra
def test_settings_round_trip(admin_token: str) -> None:
    try:
        resp = client.get("/api/admin/settings", headers=_auth(admin_token))
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert [g["id"] for g in body["groups"]] == [
            "institute",
            "academic",
            "finance",
            "notifications",
        ]
        assert body["platform"]["env"]
        assert body["platform"]["version"]
        items = {
            item["key"]: item
            for group in body["groups"]
            for item in group["items"]
        }
        assert "institute.name" in items
        assert items["institute.name"]["source"] in {"env", "db"}
        assert items["academic.default_target_band"]["options"] == [
            "5.5",
            "6.0",
            "6.5",
            "7.0",
            "7.5",
            "8.0",
            "8.5",
            "9.0",
        ]

        # PATCH → value persists and flips to a DB override
        resp = client.patch(
            "/api/admin/settings",
            headers=_auth(admin_token),
            json={
                "institute.name": "Settings Test Academy",
                "academic.default_target_band": "8.0",
                "finance.suspend_on_overdue": False,
            },
        )
        assert resp.status_code == 200, resp.text
        items = {
            item["key"]: item
            for group in resp.json()["groups"]
            for item in group["items"]
        }
        assert items["institute.name"]["value"] == "Settings Test Academy"
        assert items["institute.name"]["source"] == "db"
        assert items["academic.default_target_band"]["value"] == "8.0"
        assert items["finance.suspend_on_overdue"]["value"] is False

        # admin edits flow through to the public branding endpoint
        branding = client.get("/api/branding").json()
        assert branding["name"] == "Settings Test Academy"
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_patch_validation_errors(admin_token: str) -> None:
    resp = client.patch(
        "/api/admin/settings",
        headers=_auth(admin_token),
        json={
            "academic.default_target_band": "9.5",
            "finance.grace_period": "99 days",
            "no.such.key": 1,
        },
    )
    assert resp.status_code == 422
    errors = resp.json()["detail"]["errors"]
    assert set(errors) == {
        "academic.default_target_band",
        "finance.grace_period",
        "no.such.key",
    }


@requires_infra
def test_reset_restores_env_source(admin_token: str) -> None:
    client.patch(
        "/api/admin/settings",
        headers=_auth(admin_token),
        json={"institute.tagline": "Temporary tagline"},
    )
    resp = client.post("/api/admin/settings/reset", headers=_auth(admin_token))
    assert resp.status_code == 200
    items = {
        item["key"]: item
        for group in resp.json()["groups"]
        for item in group["items"]
    }
    assert items["institute.tagline"]["source"] == "env"
