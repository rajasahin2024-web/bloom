"""Public content router — read-only published CMS content for the website.

No auth. Only `status=published` rows are exposed; draft content is invisible.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.cms import CmsPage, CmsPost
from app.models.enums import CmsStatus
from app.schemas.cms import CmsPageOut, CmsPostOut
from app.schemas.common import Page, Pagination

router = APIRouter(prefix="/api/content", tags=["content"])

_SEED_HOME = Path(__file__).resolve().parents[1] / "seed" / "home_sections.json"


def _ensure_home_page(db: Session) -> CmsPage | None:
    """Seed the `home` page from the bundled prototype export — idempotent.

    Runs once when the row is absent or still carries no sections; admins
    edit the persisted row afterwards.
    """
    row = db.scalar(select(CmsPage).where(CmsPage.slug == "home"))
    if row is not None and row.sections:
        return row
    try:
        seed = json.loads(_SEED_HOME.read_text(encoding="utf-8"))
    except OSError:
        return row
    if row is None:
        row = CmsPage(
            slug="home",
            title=seed["title"],
            status=CmsStatus.published,
            published_at=datetime.now(UTC),
        )
        db.add(row)
    row.meta_description = seed.get("meta_description")
    row.sections = seed["sections"]
    db.commit()
    db.refresh(row)
    return row



@router.get("/pages/{slug}", response_model=CmsPageOut)
def get_page_by_slug(slug: str, db: Session = Depends(get_db)) -> CmsPageOut:
    if slug == "home":
        _ensure_home_page(db)
    page = db.scalar(
        select(CmsPage).where(CmsPage.slug == slug, CmsPage.status == CmsStatus.published)
    )
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return CmsPageOut.model_validate(page)


@router.get("/posts", response_model=Page[CmsPostOut])
def list_published_posts(
    pagination: Pagination = Depends(),
    category: str | None = Query(default=None),
    featured: bool | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Page[CmsPostOut]:
    query = select(CmsPost).where(CmsPost.status == CmsStatus.published)
    if category is not None:
        query = query.where(CmsPost.category == category)
    if featured is not None:
        query = query.where(CmsPost.featured == featured)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(CmsPost.published_at.desc().nullslast())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[CmsPostOut.model_validate(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/posts/{slug}", response_model=CmsPostOut)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)) -> CmsPostOut:
    post = db.scalar(
        select(CmsPost).where(CmsPost.slug == slug, CmsPost.status == CmsStatus.published)
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return CmsPostOut.model_validate(post)
