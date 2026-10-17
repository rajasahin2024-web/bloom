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
from app.routers.content import _ensure_home_page
from app.services import section_schemas

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
def _cleanup_home_page() -> Generator[None, None, None]:
    yield
    if not _infra_up():
        return
    conn = _pg()
    conn.execute("DELETE FROM cms_pages WHERE slug = 'home'")
    conn.close()


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
    _ensure_home_page(db_session)  # type: ignore[arg-type]
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

    _ensure_home_page(db_session)  # type: ignore[arg-type]
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

    _ensure_home_page(db_session)  # type: ignore[arg-type]
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
