"""Tests for the CMS admin API — typed section validation and media upload.

Unit tests for ``section_schemas`` run hermetically. Integration tests run
against the local docker stack when it's up (same convention as
test_setup.py / test_settings.py) — they create their own admin user and
clean up afterwards.
"""

from __future__ import annotations

import json
import socket
import uuid
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from app.models.enums import UserRole
from app.services import section_schemas
from app.services import setup as setup_service

client = TestClient(app)

PG_HOST = "localhost"
PG_PORT = 5433
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"

TEST_ADMIN_EMAIL = "cms-test-admin@techfly.dev"


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


# ── section_schemas unit tests (hermetic) ───────────────────────────────


def test_validate_sections_accepts_valid_typed_sections() -> None:
    sections = [
        {
            "id": "site_nav",
            "label": "Site navigation",
            "type": "nav",
            "enabled": True,
            "animation": None,
            "props": {
                "brand": {"name": "Bloom", "tagline": "IELTS", "logo_url": "/x.png"},
                "links": [{"label": "About", "href": "/about"}],
                "cta": {
                    "signin_href": "/login",
                    "signup_href": "/signup",
                    "signup_label": "Start",
                },
            },
        }
    ]
    assert section_schemas.validate_sections(sections) == []


def test_validate_sections_rejects_unknown_type() -> None:
    sections = [
        {
            "id": "bad",
            "label": "Bad",
            "type": "no_such_type",
            "enabled": True,
            "props": {},
        }
    ]
    errors = section_schemas.validate_sections(sections)
    assert len(errors) == 1
    assert "unknown type" in errors[0]


def test_validate_sections_rejects_missing_required_props() -> None:
    sections = [
        {
            "id": "hero",
            "label": "Hero",
            "type": "hero",
            "enabled": True,
            "props": {"badge": "x"},
        }
    ]
    errors = section_schemas.validate_sections(sections)
    assert any("headline" in e for e in errors)
    assert any("primary_btn" in e for e in errors)


def test_validate_sections_rejects_missing_top_level_keys() -> None:
    sections = [{"id": "x", "label": "X", "type": "nav"}]
    errors = section_schemas.validate_sections(sections)
    assert any("enabled" in e for e in errors)
    assert any("props" in e for e in errors)


def test_validate_sections_allows_extra_props_keys() -> None:
    sections = [
        {
            "id": "cta",
            "label": "CTA",
            "type": "cta_strip",
            "enabled": True,
            "props": {
                "heading": "h",
                "body": "b",
                "cta": {"label": "l", "href": "/x"},
                "future_field": "ignored",
            },
        }
    ]
    assert section_schemas.validate_sections(sections) == []


def test_validate_animation_rejects_bad_type() -> None:
    sections = [
        {
            "id": "cta",
            "label": "CTA",
            "type": "cta_strip",
            "enabled": True,
            "animation": {"type": "bounce"},
            "props": {
                "heading": "h",
                "body": "b",
                "cta": {"label": "l", "href": "/x"},
            },
        }
    ]
    errors = section_schemas.validate_sections(sections)
    assert any("animation" in e for e in errors)


def test_validate_animation_accepts_valid_types() -> None:
    for anim_type in ("fade", "slide", "none", "marquee-ltr"):
        sections = [
            {
                "id": "cta",
                "label": "CTA",
                "type": "cta_strip",
                "enabled": True,
                "animation": {"type": anim_type, "delay_ms": 0, "speed_s": 1.0},
                "props": {
                    "heading": "h",
                    "body": "b",
                    "cta": {"label": "l", "href": "/x"},
                },
            }
        ]
        assert section_schemas.validate_sections(sections) == []


def test_is_typed_section_detects_props() -> None:
    assert section_schemas.is_typed_section({"props": {}}) is True
    assert section_schemas.is_typed_section({"html": "<x>"}) is False
    assert section_schemas.is_typed_section({}) is False


def test_seed_home_sections_validate() -> None:
    seed_path = Path(__file__).resolve().parents[1] / "seed" / "home_sections.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    errors = section_schemas.validate_sections(seed["sections"])
    assert errors == []
    assert section_schemas.is_typed_section(seed["sections"][0]) is True


# ── auth guard ───────────────────────────────────────────────────────────


def test_cms_requires_admin() -> None:
    assert client.get("/api/cms/pages").status_code == 401
    assert client.post("/api/cms/media/upload", json={}).status_code == 401


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
    user_id = str(uuid.uuid4())
    conn = _pg()
    conn.execute(
        "INSERT INTO users (id, email, full_name, role, is_active, created_at,"
        " updated_at) VALUES (%s, %s, 'CMS Test Admin', 'admin', true, %s, %s)",
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


# 1x1 transparent PNG
_PNG_DATA_URL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
    "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


@requires_infra
def test_media_upload_and_delete(
    admin_token: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(setup_service, "UPLOADS_DIR", tmp_path)
    resp = client.post(
        "/api/cms/media/upload",
        headers=_auth(admin_token),
        json={
            "filename": "test.png",
            "mime_type": "image/png",
            "data_url": _PNG_DATA_URL,
            "alt_text": "a test image",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["filename"] == "test.png"
    assert body["url"].startswith("/uploads/cms/")
    assert body["alt_text"] == "a test image"
    media_id = body["id"]
    assert (tmp_path / "cms").is_dir()
    files = list((tmp_path / "cms").glob("*.png"))
    assert len(files) == 1

    resp = client.delete(
        f"/api/cms/media/{media_id}", headers=_auth(admin_token)
    )
    assert resp.status_code == 204
    assert not list((tmp_path / "cms").glob("*.png"))


@requires_infra
def test_media_upload_rejects_invalid_data_url(admin_token: str) -> None:
    resp = client.post(
        "/api/cms/media/upload",
        headers=_auth(admin_token),
        json={"filename": "x.png", "data_url": "not-a-data-url"},
    )
    assert resp.status_code == 422


@requires_infra
def test_patch_page_validates_sections(admin_token: str) -> None:
    resp = client.post(
        "/api/cms/pages",
        headers=_auth(admin_token),
        json={"slug": "test-cms-page", "title": "Test Page"},
    )
    assert resp.status_code == 201, resp.text
    page_id = resp.json()["id"]

    valid_sections = [
        {
            "id": "cta",
            "label": "CTA",
            "type": "cta_strip",
            "enabled": True,
            "props": {
                "heading": "h",
                "body": "b",
                "cta": {"label": "l", "href": "/x"},
            },
        }
    ]
    resp = client.patch(
        f"/api/cms/pages/{page_id}",
        headers=_auth(admin_token),
        json={"sections": valid_sections},
    )
    assert resp.status_code == 200, resp.text

    invalid_sections = [
        {
            "id": "bad",
            "label": "Bad",
            "type": "no_such_type",
            "enabled": True,
            "props": {},
        }
    ]
    resp = client.patch(
        f"/api/cms/pages/{page_id}",
        headers=_auth(admin_token),
        json={"sections": invalid_sections},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail["message"] == "Section validation failed"
    assert len(detail["errors"]) >= 1

    client.delete(f"/api/cms/pages/{page_id}", headers=_auth(admin_token))
