"""Tests for the public content API — home page seeding and typed sections.

Integration tests run against the local docker stack when it's up (same
convention as test_setup.py / test_settings.py).
"""

from __future__ import annotations

import json
import socket
from collections.abc import Generator
from pathlib import Path

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import get_db
from app.main import app
from app.models.cms import CmsPage
from app.models.enums import CmsStatus
from app.routers.content import _PAGE_SEEDS, _ensure_page
from app.services import section_schemas

SITE_SLUGS = [
    "home",
    "ielts",
    "platform",
    "courses",
    "results",
    "abroad",
    "medical",
    "blog",
    "about",
    "careers",
    "contact",
    "login",
]

client = TestClient(app)

PG_HOST = "localhost"
PG_PORT = 5433
PG_DB = "bloom"
PG_USER = "bloom"
PG_PASSWORD = "bloom_dev_password"


def _infra_up() -> bool:
    try:
        socket.create_connection((PG_HOST, PG_PORT), timeout=1).close()
        return True
    except OSError:
        return False


requires_infra = pytest.mark.skipif(
    not _infra_up(), reason="local docker stack is not running"
)


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
def db_session() -> Generator[object, None, None]:
    gen = get_db()
    db = next(gen)
    yield db
    gen.close()


@pytest.fixture(autouse=True)
def _cleanup_site_pages() -> Generator[None, None, None]:
    yield
    if not _infra_up():
        return
    conn = _pg()
    for slug in SITE_SLUGS:
        conn.execute("DELETE FROM cms_pages WHERE slug = %s", (slug,))
    conn.close()


def _ensure_home_page(db: object) -> object:
    """Back-compat wrapper for existing home-seeding tests."""
    return _ensure_page(db, "home")  # type: ignore[arg-type]


@requires_infra
def test_get_home_page_returns_typed_sections() -> None:
    resp = client.get("/api/content/pages/home")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["slug"] == "home"
    sections = body["sections"]
    assert sections is not None
    assert len(sections) > 0
    for section in sections:
        assert "props" in section
        assert isinstance(section["props"], dict)
    assert section_schemas.is_typed_section(sections[0]) is True


@requires_infra
def test_seed_idempotency_preserves_typed_sections(
    db_session: object,
) -> None:
    _ensure_home_page(db_session)
    row = db_session.execute(  # type: ignore[attr-defined]
        select(CmsPage).where(CmsPage.slug == "home")
    ).scalar_one()
    original_sections = row.sections
    assert original_sections is not None
    assert len(original_sections) > 0

    # Mutate the persisted sections to prove the second call doesn't overwrite.
    row.sections = [
        {
            "id": "custom",
            "label": "Custom",
            "type": "cta_strip",
            "enabled": True,
            "animation": None,
            "props": {
                "heading": "custom heading",
                "body": "custom body",
                "cta": {"label": "go", "href": "/go"},
            },
        }
    ]
    db_session.commit()  # type: ignore[attr-defined]

    _ensure_home_page(db_session)
    db_session.refresh(row)  # type: ignore[attr-defined]
    assert row.sections is not None
    assert len(row.sections) == 1
    assert row.sections[0]["id"] == "custom"


@requires_infra
def test_ensure_home_page_reseeds_old_html_format(
    db_session: object,
) -> None:
    row = CmsPage(
        slug="home",
        title="Old Home",
        status=CmsStatus.published,
        sections=[
            {"id": "old", "label": "Old", "type": "section", "enabled": True, "html": "<p>old</p>"}
        ],
    )
    db_session.add(row)  # type: ignore[attr-defined]
    db_session.commit()  # type: ignore[attr-defined]

    _ensure_home_page(db_session)
    db_session.refresh(row)  # type: ignore[attr-defined]
    assert row.sections is not None
    assert section_schemas.is_typed_section(row.sections[0]) is True
    assert row.sections[0].get("html") is None


def test_seed_file_has_typed_sections() -> None:
    seed_path = Path(__file__).resolve().parents[1] / "seed" / "home_sections.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    assert section_schemas.is_typed_section(seed["sections"][0]) is True
    errors = section_schemas.validate_sections(seed["sections"])
    assert errors == []


def test_seed_home_has_no_nav_footer_sections() -> None:
    """Nav/footer live in the shared site-chrome, not per-page sections."""
    seed_path = Path(__file__).resolve().parents[1] / "seed" / "home_sections.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    types = [s["type"] for s in seed["sections"]]
    assert "nav" not in types
    assert "footer" not in types


def test_site_chrome_seed_loads() -> None:
    chrome_path = Path(__file__).resolve().parents[1] / "seed" / "site_chrome.json"
    chrome = json.loads(chrome_path.read_text(encoding="utf-8"))
    assert "nav" in chrome and "footer" in chrome
    assert chrome["nav"]["brand"]["name"]
    assert chrome["nav"]["links"]
    assert chrome["nav"]["mobile_links"]
    assert chrome["footer"]["columns"]
    assert chrome["footer"]["copyright"]


def test_get_site_chrome_endpoint() -> None:
    resp = client.get("/api/content/site-chrome")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["nav"]["brand"]["name"] == "Bloom"
    assert body["footer"]["copyright"]


# ── TEC-134: the 11 new prototype pages ──────────────────────────────

NEW_PAGE_SLUGS = [s for s in SITE_SLUGS if s != "home"]


@pytest.mark.parametrize("slug", NEW_PAGE_SLUGS)
def test_seed_file_validates(slug: str) -> None:
    """Every bundled page seed carries only typed, schema-valid sections."""
    seed_path = Path(__file__).resolve().parents[1] / "seed" / f"{slug}_sections.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    assert seed["slug"] == slug
    assert seed["title"]
    assert seed["sections"], f"{slug}: no sections"
    for section in seed["sections"]:
        assert section_schemas.is_typed_section(section) is True
    assert section_schemas.validate_sections(seed["sections"]) == []


@requires_infra
@pytest.mark.parametrize("slug", SITE_SLUGS)
def test_get_page_returns_typed_sections(slug: str) -> None:
    resp = client.get(f"/api/content/pages/{slug}")
    assert resp.status_code == 200, f"{slug}: {resp.text}"
    body = resp.json()
    assert body["slug"] == slug
    sections = body["sections"]
    assert sections is not None and len(sections) > 0
    for section in sections:
        assert "props" in section
        assert isinstance(section["props"], dict)
        assert section["type"] in section_schemas.SECTION_TYPES
    # Persisted content must stay schema-valid end to end.
    assert section_schemas.validate_sections(sections) == []


@requires_infra
def test_new_pages_seeded_idempotently(db_session: object) -> None:
    """Seeding a page twice must not overwrite admin-edited typed sections."""
    _ensure_page(db_session, "ielts")  # type: ignore[arg-type]
    row = db_session.execute(  # type: ignore[attr-defined]
        select(CmsPage).where(CmsPage.slug == "ielts")
    ).scalar_one()
    assert row.sections and section_schemas.is_typed_section(row.sections[0])
    row.sections = [
        {
            "id": "custom",
            "label": "Custom",
            "type": "cta_strip",
            "enabled": True,
            "animation": None,
            "props": {
                "heading": "custom heading",
                "body": "custom body",
                "cta": {"label": "go", "href": "/go"},
            },
        }
    ]
    db_session.commit()  # type: ignore[attr-defined]
    _ensure_page(db_session, "ielts")  # type: ignore[arg-type]
    db_session.refresh(row)  # type: ignore[attr-defined]
    assert len(row.sections) == 1
    assert row.sections[0]["id"] == "custom"


@requires_infra
def test_unknown_slug_returns_404() -> None:
    resp = client.get("/api/content/pages/no-such-page")
    assert resp.status_code == 404


def test_all_seed_slugs_have_files() -> None:
    """The router's slug→seed map must point at files that exist."""
    seed_dir = Path(__file__).resolve().parents[1] / "seed"
    for slug, name in _PAGE_SEEDS.items():
        assert (seed_dir / name).exists(), f"missing seed {name} for {slug}"
