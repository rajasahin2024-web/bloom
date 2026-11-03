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


# ── TEC-164: authors / categories / post taxonomy ────────────────────────


@pytest.fixture
def blog_cleanup() -> Generator[dict[str, list[str]], None, None]:
    """Track created blog rows and delete them in FK-safe order."""
    created: dict[str, list[str]] = {"posts": [], "categories": [], "authors": []}
    yield created
    if not _infra_up():
        return
    conn = _pg()
    for pid in created["posts"]:
        conn.execute("DELETE FROM cms_posts WHERE id = %s", (pid,))
    for cid in created["categories"]:
        conn.execute("DELETE FROM cms_categories WHERE id = %s", (cid,))
    for aid in created["authors"]:
        conn.execute("DELETE FROM cms_authors WHERE id = %s", (aid,))
    conn.close()


def _make_author(token: str, slug: str) -> str:
    resp = client.post(
        "/api/cms/authors",
        headers=_auth(token),
        json={"name": "Test Author", "slug": slug},
    )
    assert resp.status_code == 201, resp.text
    author_id: str = resp.json()["id"]
    return author_id


def _make_category(token: str, slug: str, parent_id: str | None = None) -> str:
    resp = client.post(
        "/api/cms/categories",
        headers=_auth(token),
        json={
            "name": slug.replace("-", " ").title(),
            "slug": slug,
            "parent_id": parent_id,
        },
    )
    assert resp.status_code == 201, resp.text
    category_id: str = resp.json()["id"]
    return category_id


@requires_infra
def test_author_crud(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    resp = client.post(
        "/api/cms/authors",
        headers=_auth(admin_token),
        json={
            "name": "Priya Sen",
            "slug": "priya-sen",
            "role": "IELTS Trainer",
            "bio": "Ten years of band-9 coaching.",
            "email": "priya@example.com",
            "linkedin_url": "https://linkedin.com/in/priya",
        },
    )
    assert resp.status_code == 201, resp.text
    author = resp.json()
    blog_cleanup["authors"].append(author["id"])
    assert author["name"] == "Priya Sen"
    assert author["role"] == "IELTS Trainer"

    resp = client.get("/api/cms/authors", headers=_auth(admin_token), params={"q": "priya"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["slug"] == "priya-sen"

    resp = client.get("/api/cms/authors", headers=_auth(admin_token), params={"q": "nobody"})
    assert resp.json()["total"] == 0

    resp = client.get(f"/api/cms/authors/{author['id']}", headers=_auth(admin_token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "priya@example.com"

    resp = client.patch(
        f"/api/cms/authors/{author['id']}",
        headers=_auth(admin_token),
        json={"role": "Head Trainer", "bio": None},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "Head Trainer"
    assert resp.json()["bio"] is None

    resp = client.delete(f"/api/cms/authors/{author['id']}", headers=_auth(admin_token))
    assert resp.status_code == 204
    blog_cleanup["authors"].remove(author["id"])
    resp = client.get(f"/api/cms/authors/{author['id']}", headers=_auth(admin_token))
    assert resp.status_code == 404


@requires_infra
def test_author_slug_conflict(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    blog_cleanup["authors"].append(_make_author(admin_token, "dup-author"))
    resp = client.post(
        "/api/cms/authors",
        headers=_auth(admin_token),
        json={"name": "Other", "slug": "dup-author"},
    )
    assert resp.status_code == 409
    assert resp.json()["detail"] == "slug_taken"


@requires_infra
def test_category_crud_and_nesting(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    parent = _make_category(admin_token, "ielts-tips")
    child = _make_category(admin_token, "ielts-writing", parent_id=parent)
    blog_cleanup["categories"] += [parent, child]

    # One level only — a child cannot be a parent.
    resp = client.post(
        "/api/cms/categories",
        headers=_auth(admin_token),
        json={"name": "Grandchild", "slug": "grandchild", "parent_id": child},
    )
    assert resp.status_code == 422

    # Flat list is ordered parent-then-child.
    resp = client.get("/api/cms/categories", headers=_auth(admin_token))
    assert resp.status_code == 200
    slugs = [c["slug"] for c in resp.json()]
    assert slugs.index("ielts-tips") < slugs.index("ielts-writing")

    # Deleting a parent with children is rejected.
    resp = client.delete(f"/api/cms/categories/{parent}", headers=_auth(admin_token))
    assert resp.status_code == 409

    resp = client.delete(f"/api/cms/categories/{child}", headers=_auth(admin_token))
    assert resp.status_code == 204
    blog_cleanup["categories"].remove(child)
    resp = client.delete(f"/api/cms/categories/{parent}", headers=_auth(admin_token))
    assert resp.status_code == 204
    blog_cleanup["categories"].remove(parent)


@requires_infra
def test_post_fk_denormalization_and_meta(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    author_id = _make_author(admin_token, "post-author")
    cat_id = _make_category(admin_token, "study-abroad")
    sub_id = _make_category(admin_token, "canada", parent_id=cat_id)
    blog_cleanup["authors"].append(author_id)
    blog_cleanup["categories"] += [cat_id, sub_id]

    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={
            "slug": "tax-post",
            "title": "Study in Canada",
            "body": "<p>" + "word " * 500 + "</p>",
            "author_id": author_id,
            "category_id": cat_id,
            "subcategory_id": sub_id,
            "meta_title": "Meta T",
            "meta_description": "Meta D",
            "status": "published",
        },
    )
    assert resp.status_code == 201, resp.text
    post = resp.json()
    blog_cleanup["posts"].append(post["id"])
    assert post["author"] == "Test Author"
    assert post["category"] == "Study Abroad"
    assert post["subcategory"] == "Canada"
    assert post["author_id"] == author_id
    assert post["category_id"] == cat_id
    assert post["subcategory_id"] == sub_id
    assert post["meta_title"] == "Meta T"
    assert post["meta_description"] == "Meta D"
    assert post["read_minutes"] == 3  # ceil(500/200)


@requires_infra
def test_post_subcategory_must_be_child_of_category(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    cat_a = _make_category(admin_token, "cat-a")
    cat_b = _make_category(admin_token, "cat-b")
    blog_cleanup["categories"] += [cat_a, cat_b]

    # subcategory_id without category_id → 422
    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={"slug": "p1", "title": "P1", "subcategory_id": cat_b},
    )
    assert resp.status_code == 422

    # subcategory_id that is not a child of category_id → 422
    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={
            "slug": "p2",
            "title": "P2",
            "category_id": cat_a,
            "subcategory_id": cat_b,
        },
    )
    assert resp.status_code == 422


@requires_infra
def test_post_body_is_sanitized(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={
            "slug": "xss-post",
            "title": "XSS",
            "body": (
                '<p onclick="steal()">ok</p><script>alert(1)</script>'
                '<iframe src="https://evil.example"></iframe>'
                '<a href="javascript:alert(1)" target="_blank">bad</a>'
                '<a href="https://good.example" target="_blank">good</a>'
            ),
        },
    )
    assert resp.status_code == 201, resp.text
    blog_cleanup["posts"].append(resp.json()["id"])
    body = resp.json()["body"]
    assert "<script" not in body
    assert "<iframe" not in body
    assert "onclick" not in body
    assert "javascript:" not in body
    assert "<p>ok</p>" in body
    assert 'href="https://good.example"' in body
    assert 'rel="noopener noreferrer"' in body


@requires_infra
def test_post_slug_taken(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={"slug": "dupe-post", "title": "First"},
    )
    assert resp.status_code == 201, resp.text
    blog_cleanup["posts"].append(resp.json()["id"])
    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={"slug": "dupe-post", "title": "Second"},
    )
    assert resp.status_code == 409
    assert resp.json()["detail"] == "slug_taken"


@requires_infra
def test_patch_post_revalidates_subcategory(
    admin_token: str, blog_cleanup: dict[str, list[str]]
) -> None:
    cat_a = _make_category(admin_token, "patch-cat-a")
    child_a = _make_category(admin_token, "patch-child-a", parent_id=cat_a)
    cat_b = _make_category(admin_token, "patch-cat-b")
    blog_cleanup["categories"] += [cat_a, child_a, cat_b]

    resp = client.post(
        "/api/cms/posts",
        headers=_auth(admin_token),
        json={
            "slug": "patch-post",
            "title": "Patch me",
            "category_id": cat_a,
            "subcategory_id": child_a,
        },
    )
    assert resp.status_code == 201, resp.text
    post_id = resp.json()["id"]
    blog_cleanup["posts"].append(post_id)

    # Moving the category under cat-b strands the existing subcategory.
    resp = client.patch(
        f"/api/cms/posts/{post_id}",
        headers=_auth(admin_token),
        json={"category_id": cat_b},
    )
    assert resp.status_code == 422

    # Clearing the subcategory while moving is accepted and denormalizes.
    resp = client.patch(
        f"/api/cms/posts/{post_id}",
        headers=_auth(admin_token),
        json={"category_id": cat_b, "subcategory_id": None},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["category"] == "Patch Cat B"
    assert body["subcategory"] is None


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
