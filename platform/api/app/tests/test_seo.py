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
        # Phase 2 — social sharing + structured data
        "seo.og_title",
        "seo.og_description",
        "seo.twitter_card",
        "seo.twitter_handle",
        "seo.fb_app_id",
        "seo.schema_type",
        "seo.geo_lat",
        "seo.geo_lng",
        "seo.opening_hours",
        "seo.faq_schema_enabled",
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


def test_seo_social_keys_validate() -> None:
    assert _validate("seo.twitter_card", "summary") == {}
    assert _validate("seo.twitter_card", "summary_large_image") == {}
    assert _validate("seo.twitter_card", "large")
    assert _validate("seo.twitter_handle", "@bloomielts") == {}
    assert _validate("seo.twitter_handle", "bloomielts") == {}
    assert _validate("seo.twitter_handle", "") == {}
    assert _validate("seo.twitter_handle", "not a handle!")
    assert _validate("seo.fb_app_id", "123456789012345") == {}
    assert _validate("seo.fb_app_id", "") == {}
    assert _validate("seo.fb_app_id", "abc123")
    assert _validate("seo.og_title", "Bloom — IELTS prep") == {}
    assert _validate("seo.og_description", "x" * 321)  # over max_length


def test_seo_schema_keys_validate() -> None:
    assert _validate("seo.schema_type", "EducationalOrganization") == {}
    assert _validate("seo.schema_type", "LocalBusiness") == {}
    assert _validate("seo.schema_type", "Organization")
    assert _validate("seo.faq_schema_enabled", False) == {}
    assert _validate("seo.faq_schema_enabled", "yes")


def test_seo_localbusiness_fields_validate() -> None:
    assert _validate("seo.geo_lat", "51.5074") == {}
    assert _validate("seo.geo_lat", "-33.86") == {}
    assert _validate("seo.geo_lat", "") == {}
    assert _validate("seo.geo_lat", "91")
    assert _validate("seo.geo_lat", "abc")
    assert _validate("seo.geo_lat", "nan")
    assert _validate("seo.geo_lng", "-0.1278") == {}
    assert _validate("seo.geo_lng", "181")
    assert _validate("seo.opening_hours", "Mo-Fr 09:00-18:00") == {}
    assert _validate("seo.opening_hours", "Mo-Fr 09:00-18:00; Sa 10:00-14:00") == {}
    assert _validate("seo.opening_hours", "") == {}
    assert _validate("seo.opening_hours", "9 to 6 weekdays")
    assert _validate("seo.opening_hours", "Mo-Fr 25:00-26:00")


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


def test_seo_meta_includes_social_and_schema() -> None:
    body = client.get("/api/seo/meta?path=/").json()
    assert set(body["og"]) == {
        "type",
        "title",
        "description",
        "url",
        "site_name",
        "image",
    }
    assert set(body["twitter"]) == {"card", "site", "title", "description", "image"}
    assert body["twitter"]["card"] in {"summary", "summary_large_image"}
    assert body["og"]["title"] == body["title"]  # og_title falls back
    schemas = body["json_ld"]
    assert isinstance(schemas, list) and schemas
    org = schemas[0]
    assert org["@type"] in {"EducationalOrganization", "LocalBusiness"}
    assert org["name"]
    tags = "\n".join(body["head_tags"])
    assert 'property="og:title"' in tags
    assert 'name="twitter:card"' in tags
    assert 'type="application/ld+json"' in tags


def test_seo_meta_course_path_gets_course_schema() -> None:
    body = client.get("/api/seo/meta?path=/courses/ielts-foundation").json()
    types = [s.get("@type") for s in body["json_ld"]]
    assert "Course" in types
    course = body["json_ld"][types.index("Course")]
    assert course["name"] == "Ielts Foundation"
    assert course["provider"]["name"]


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


# ── Phase 2: social sharing + structured data ────────────────────────────


@requires_infra
def test_social_meta_round_trip(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "seo.og_title": "OG Title",
                "seo.og_description": "OG share description",
                "seo.twitter_card": "summary",
                "seo.twitter_handle": "@bloomtest",
                "seo.fb_app_id": "123456789012345",
            },
        )
        meta = client.get("/api/seo/meta?path=/about").json()
        assert meta["og"]["title"] == "OG Title"
        assert meta["og"]["description"] == "OG share description"
        assert meta["og"]["url"] == "https://bloom.example/about"
        assert meta["twitter"]["card"] == "summary"
        assert meta["twitter"]["site"] == "@bloomtest"
        assert meta["twitter"]["title"] == "OG Title"
        assert meta["fb_app_id"] == "123456789012345"
        tags = "\n".join(meta["head_tags"])
        assert 'property="og:title" content="OG Title"' in tags
        assert 'name="twitter:site" content="@bloomtest"' in tags
        assert 'property="fb:app_id" content="123456789012345"' in tags

        # Overrides fall back to the page title / meta description.
        _patch(admin_token, {"seo.og_title": "", "seo.og_description": ""})
        meta = client.get("/api/seo/meta?path=/about").json()
        assert meta["og"]["title"] == meta["title"]
        assert meta["og"]["description"] == meta["description"]
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_localbusiness_schema_round_trip(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "institute.address": "1 Test Street, London",
                "institute.phone": "+44 20 0000 0000",
                "seo.schema_type": "LocalBusiness",
                "seo.geo_lat": "51.5074",
                "seo.geo_lng": "-0.1278",
                "seo.opening_hours": "Mo-Fr 09:00-18:00; Sa 10:00-14:00",
            },
        )
        meta = client.get("/api/seo/meta").json()
        org = meta["json_ld"][0]
        assert org["@type"] == "LocalBusiness"
        assert org["url"] == "https://bloom.example"
        assert org["address"] == {
            "@type": "PostalAddress",
            "streetAddress": "1 Test Street, London",
        }
        assert org["telephone"] == "+44 20 0000 0000"
        assert org["geo"] == {
            "@type": "GeoCoordinates",
            "latitude": 51.5074,
            "longitude": -0.1278,
        }
        assert org["openingHours"] == [
            "Mo-Fr 09:00-18:00",
            "Sa 10:00-14:00",
        ]
        tags = "\n".join(meta["head_tags"])
        assert '"@type":"LocalBusiness"' in tags

        # LocalBusiness-only fields are validated server-side.
        resp = client.patch(
            "/api/admin/settings",
            headers=_auth(admin_token),
            json={"seo.geo_lat": "north"},
        )
        assert resp.status_code == 422
        assert "seo.geo_lat" in resp.json()["detail"]["errors"]
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_faqpage_schema_behind_toggle(admin_token: str) -> None:
    conn = _pg()
    conn.execute(
        "INSERT INTO cms_pages (id, slug, title, body, status, json_ld,"
        " created_at, updated_at) VALUES (%s, 'faq', 'FAQ', '', 'published',"
        " %s::jsonb, %s, %s)",
        (
            str(uuid.uuid4()),
            '{"@type": "FAQPage", "mainEntity": []}',
            datetime.now(UTC),
            datetime.now(UTC),
        ),
    )
    conn.close()
    try:
        meta = client.get("/api/seo/meta?path=/faq").json()
        assert "FAQPage" in [s.get("@type") for s in meta["json_ld"]]

        _patch(admin_token, {"seo.faq_schema_enabled": False})
        meta = client.get("/api/seo/meta?path=/faq").json()
        assert "FAQPage" not in [s.get("@type") for s in meta["json_ld"]]
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))
        conn = _pg()
        conn.execute("DELETE FROM cms_pages WHERE slug = 'faq'")
        conn.close()


# ── Phase 3: AIO settings + sitemap options ──────────────────────────────


def test_aio_registry_keys_exist() -> None:
    aio = {
        "aio.enabled",
        "aio.crawler_policy",
        "aio.crawler_list",
        "aio.custom_robots",
        "aio.llms_txt_enabled",
        "aio.llms_txt",
        "aio.org_summary",
        "aio.key_facts",
        "aio.same_as",
    }
    sitemap = {
        "sitemap.include_pages",
        "sitemap.include_posts",
        "sitemap.extra_paths",
    }
    assert aio | sitemap <= set(_SPEC)
    assert all(_SPEC[k].group == "aio" for k in aio)
    assert all(_SPEC[k].group == "sitemap" for k in sitemap)


def test_aio_validation() -> None:
    assert _validate("aio.enabled", True) == {}
    assert _validate("aio.enabled", "yes")
    assert _validate("aio.crawler_policy", "Block listed") == {}
    assert _validate("aio.crawler_policy", "Allow all") == {}
    assert _validate("aio.crawler_policy", "block all")
    assert _validate("aio.crawler_list", "GPTBot\nClaudeBot\n") == {}
    assert _validate("aio.same_as", "https://fb.com/bloom\nhttps://x.com/bloom\n") == {}
    assert _validate("aio.same_as", "notaurl")
    assert _validate("aio.same_as", "") == {}
    assert _validate("sitemap.extra_paths", "/courses\n/about-us\n") == {}
    assert _validate("sitemap.extra_paths", "courses")
    assert _validate("sitemap.extra_paths", "https://evil.com/x")
    assert _validate("sitemap.include_pages", False) == {}
    assert _validate("sitemap.include_posts", "yes")


def test_llms_txt_serves_generated() -> None:
    resp = client.get("/llms.txt")
    # enabled by default (aio.enabled + aio.llms_txt_enabled both default on)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    assert resp.text.startswith("# ")


def test_admin_sitemap_requires_auth() -> None:
    assert client.get("/api/admin/sitemap").status_code == 401


@requires_infra
def test_llms_txt_toggle_and_override(admin_token: str) -> None:
    try:
        resp = client.get("/llms.txt")
        assert resp.status_code == 200
        assert "# Bloom" in resp.text

        _patch(admin_token, {"aio.llms_txt": "# Custom brief\n"})
        resp = client.get("/llms.txt")
        assert resp.text == "# Custom brief\n"

        _patch(admin_token, {"aio.llms_txt_enabled": False})
        assert client.get("/llms.txt").status_code == 404

        _patch(admin_token, {"aio.llms_txt_enabled": True, "aio.enabled": False})
        assert client.get("/llms.txt").status_code == 404
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_robots_ai_crawler_policies(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {"aio.crawler_policy": "Block listed", "aio.crawler_list": "GPTBot\nClaudeBot"},
        )
        body = client.get("/robots.txt").text
        assert "User-agent: GPTBot\nDisallow: /" in body
        assert "User-agent: ClaudeBot\nDisallow: /" in body

        _patch(
            admin_token,
            {
                "aio.crawler_policy": "Custom rules",
                "aio.custom_robots": "User-agent: FooBot\nDisallow: /private",
            },
        )
        body = client.get("/robots.txt").text
        assert "User-agent: FooBot\nDisallow: /private" in body

        _patch(admin_token, {"aio.enabled": False})
        body = client.get("/robots.txt").text
        assert "FooBot" not in body and "GPTBot" not in body
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_sitemap_include_flags_and_extra_paths(admin_token: str) -> None:
    conn = _pg()
    conn.execute(
        "INSERT INTO cms_pages (id, slug, title, body, status, created_at,"
        " updated_at) VALUES (%s, 'sm-page', 'SM Page', '', 'published', %s, %s)",
        (str(uuid.uuid4()), datetime.now(UTC), datetime.now(UTC)),
    )
    conn.execute(
        "INSERT INTO cms_posts (id, slug, title, body, tags, featured, status,"
        " created_at, updated_at) VALUES (%s, 'sm-post', 'SM Post', '', '{}',"
        " false, 'published', %s, %s)",
        (str(uuid.uuid4()), datetime.now(UTC), datetime.now(UTC)),
    )
    conn.close()
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "seo.sitemap_enabled": True,
                "sitemap.extra_paths": "/courses\n/partners",
            },
        )
        xml = client.get("/sitemap.xml").text
        assert "<loc>https://bloom.example/sm-page</loc>" in xml
        assert "<loc>https://bloom.example/blog/sm-post</loc>" in xml
        assert "<loc>https://bloom.example/courses</loc>" in xml
        assert "<loc>https://bloom.example/partners</loc>" in xml

        _patch(admin_token, {"sitemap.include_posts": False})
        xml = client.get("/sitemap.xml").text
        assert "/blog/sm-post" not in xml
        assert "/sm-page" in xml

        _patch(admin_token, {"sitemap.include_pages": False})
        xml = client.get("/sitemap.xml").text
        assert "/sm-page" not in xml
        assert "<loc>https://bloom.example/</loc>" in xml  # home always listed
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))
        conn = _pg()
        conn.execute("DELETE FROM cms_pages WHERE slug = 'sm-page'")
        conn.execute("DELETE FROM cms_posts WHERE slug = 'sm-post'")
        conn.close()


@requires_infra
def test_admin_sitemap_preview(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "institute.website_url": "https://bloom.example",
                "seo.sitemap_enabled": True,
            },
        )
        resp = client.get("/api/admin/sitemap", headers=_auth(admin_token))
        assert resp.status_code == 200
        body = resp.json()
        assert body["enabled"] is True
        assert body["base_url"] == "https://bloom.example"
        assert body["sitemap_url"] == "https://bloom.example/sitemap.xml"
        assert body["entry_count"] >= 1
        assert body["entries"][0]["path"] == "/"
        assert "<urlset" in body["xml"]
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))


@requires_infra
def test_aio_jsonld_round_trip(admin_token: str) -> None:
    try:
        _patch(
            admin_token,
            {
                "aio.org_summary": "IELTS academy in London.",
                "aio.same_as": "https://fb.com/bloom\nhttps://x.com/bloom",
            },
        )
        org = client.get("/api/seo/meta").json()["json_ld"][0]
        assert org["description"] == "IELTS academy in London."
        assert org["sameAs"] == ["https://fb.com/bloom", "https://x.com/bloom"]

        _patch(admin_token, {"aio.enabled": False})
        org = client.get("/api/seo/meta").json()["json_ld"][0]
        assert "sameAs" not in org
    finally:
        client.post("/api/admin/settings/reset", headers=_auth(admin_token))
