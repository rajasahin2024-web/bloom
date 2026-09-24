"""Tests for the SEO settings group and public SEO endpoints.

Per-key validation and the read-only endpoints are hermetic — they serve
registry defaults whether or not the docker stack is up. The state-changing
round-trips (custom robots.txt, indexing off, sitemap generation) are
infra-gated like test_settings.py and reset settings afterwards.
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

PG_HOST = "localhost"
PG_PORT = 5433
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"

TEST_ADMIN_EMAIL = "seo-test-admin@techfly.dev"

_SPEC = {s.key: s for s in settings_service.SPECS}


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(not _infra_up(), reason="local docker stack is not running")


def _validate(key: str, raw: object) -> dict[str, str]:
    errors: dict[str, str] = {}
    settings_service._validate(_SPEC[key], raw, errors)
    return errors


# ── per-key validation (hermetic) ────────────────────────────────────────


def test_seo_registry_keys_exist() -> None:
    expected = {
        "seo.site_title",
        "seo.title_template",
        "seo.meta_description",
        "seo.default_og_image",
        "seo.meta_keywords",
        "seo.indexing_enabled",
        "seo.robots_txt",
        "seo.sitemap_enabled",
        "seo.force_https",
        "seo.canonical_host",
        "seo.google_site_verification",
        "seo.bing_verification",
        "seo.ga4_id",
        "seo.gtm_id",
        "seo.fb_pixel_id",
        "seo.ms_clarity_id",
    }
    assert expected <= set(_SPEC)
    assert all(_SPEC[k].group == "seo" for k in expected)


def test_seo_textarea_accepts_multiline() -> None:
    assert _validate("seo.robots_txt", "User-agent: *\nAllow: /\n") == {}
    assert _validate("seo.robots_txt", "x" * 4001)  # over max_length
    assert _validate("seo.robots_txt", 42)  # must be a string
    assert _validate("seo.meta_description", "A meta description") == {}


def test_seo_toggles_and_select() -> None:
    assert _validate("seo.indexing_enabled", False) == {}
    assert _validate("seo.indexing_enabled", "off")
    assert _validate("seo.sitemap_enabled", True) == {}
    assert _validate("seo.force_https", True) == {}
    assert _validate("seo.canonical_host", "Redirect to www") == {}
    assert _validate("seo.canonical_host", "www")


def test_seo_analytics_ids_are_plain_text() -> None:
    assert _validate("seo.ga4_id", "G-ABC123") == {}
    assert _validate("seo.gtm_id", "GTM-ABC123") == {}
    assert _validate("seo.fb_pixel_id", "1234567890") == {}
    assert _validate("seo.ms_clarity_id", "abcd1234") == {}
    assert _validate("seo.ga4_id", 123)


# ── public endpoints (hermetic — defaults hold with or without the DB) ────


def test_robots_txt_serves_default() -> None:
    resp = client.get("/robots.txt")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    assert "User-agent: *" in resp.text


def test_seo_meta_resolves_global_values() -> None:
    resp = client.get("/api/seo/meta?path=/courses")
    assert resp.status_code == 200
    body = resp.json()
    assert body["path"] == "/courses"
    assert "Courses" in body["title"]
    assert body["robots"] in {"index,follow", "noindex,nofollow"}
    assert isinstance(body["head_tags"], list)
    assert set(body["verification"]) == {"google", "bing"}
    assert set(body["analytics"]) == {"ga4", "gtm", "fb_pixel", "ms_clarity"}


def test_og_image_404_when_unset() -> None:
    resp = client.get("/api/seo/og-image")
    assert resp.status_code in {200, 404}  # 200 only if a dev upload exists


# ── live round-trips against the docker stack ────────────────────────────


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
        " updated_at) VALUES (%s, %s, 'SEO Test Admin', 'admin', true,"
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


def _patch(token: str, changes: dict[str, object]) -> None:
    resp = client.patch("/api/admin/settings", headers=_auth(token), json=changes)
    assert resp.status_code == 200, resp.text


@requires_infra
def test_robots_txt_custom_and_sitemap_line(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "seo.robots_txt": "User-agent: *\nDisallow: /drafts\n",
                "seo.sitemap_enabled": True,
            },
        )
        resp = client.get("/robots.txt")
        assert resp.status_code == 200
        assert "Disallow: /drafts" in resp.text
        assert "Sitemap: https://bloom.example/sitemap.xml" in resp.text
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_indexing_off_disallows_all(admin_token: str) -> None:
    try:
        _patch(admin_token, {"seo.indexing_enabled": False})
        resp = client.get("/robots.txt")
        assert resp.text.strip() == "User-agent: *\nDisallow: /"
        meta = client.get("/api/seo/meta").json()
        assert meta["robots"] == "noindex,nofollow"
        assert '<meta name="robots" content="noindex,nofollow">' in meta["head_tags"]
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_sitemap_generated_when_enabled(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "seo.sitemap_enabled": True,
            },
        )
        resp = client.get("/sitemap.xml")
        assert resp.status_code == 200
        assert "<urlset" in resp.text
        assert "<loc>https://bloom.example/</loc>" in resp.text

        _patch(admin_token, {"seo.sitemap_enabled": False})
        assert client.get("/sitemap.xml").status_code == 404
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_verification_and_analytics_emit_tags(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "seo.google_site_verification": "goog-token-123",
                "seo.bing_verification": "bing-token-456",
                "seo.ga4_id": "G-TEST1234",
                "seo.gtm_id": "GTM-TEST123",
                "seo.fb_pixel_id": "123456789012345",
                "seo.ms_clarity_id": "clarity123",
            },
        )
        meta = client.get("/api/seo/meta").json()
        tags = "\n".join(meta["head_tags"])
        assert 'name="google-site-verification" content="goog-token-123"' in tags
        assert 'name="msvalidate.01" content="bing-token-456"' in tags
        assert "googletagmanager.com/gtag/js?id=G-TEST1234" in tags
        assert "gtm.js?id=" in tags and "GTM-TEST123" in tags
        assert "fbevents.js" in tags and "123456789012345" in tags
        assert "clarity.ms/tag/" in tags

        # Malformed IDs save fine but never reach an injected tag.
        _patch(admin_token, {"seo.ga4_id": 'x";alert(1)//'})
        tags = "\n".join(client.get("/api/seo/meta").json()["head_tags"])
        assert "alert(1)" not in tags
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_seo_group_round_trip_via_admin_api(admin_token: str) -> None:
    try:
        resp = client.get("/api/admin/settings", headers=_auth(admin_token))
        groups = {g["id"]: g for g in resp.json()["groups"]}
        assert "seo" in groups
        keys = {i["key"] for i in groups["seo"]["items"]}
        assert "seo.indexing_enabled" in keys

        _patch(admin_token, {"seo.site_title": "SEO Test Academy"})
        items = {
            i["key"]: i
            for g in client.get("/api/admin/settings", headers=_auth(admin_token)).json()["groups"]
            for i in g["items"]
        }
        assert items["seo.site_title"]["value"] == "SEO Test Academy"
        assert items["seo.site_title"]["source"] == "db"
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))
