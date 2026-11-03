"""Public content router — read-only published CMS content for the website.

No auth. Only `status=published` rows are exposed; draft content is invisible.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models.cms import CmsAuthor, CmsCategory, CmsPage, CmsPost
from app.models.enums import CmsStatus
from app.schemas.cms import (
    BlogCategoryOut,
    CmsPageOut,
    CmsPostDetailOut,
    CmsPostOut,
)
from app.schemas.common import Page, Pagination
from app.services import section_schemas

router = APIRouter(prefix="/api/content", tags=["content"])

_SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
_SEED_CHROME = _SEED_DIR / "site_chrome.json"

# Slug → bundled seed file for the public site pages. Pages not in this map
# are served from the DB only (no auto-seed).
_PAGE_SEEDS = {
    "home": "home_sections.json",
    "ielts": "ielts_sections.json",
    "platform": "platform_sections.json",
    "courses": "courses_sections.json",
    "results": "results_sections.json",
    "abroad": "abroad_sections.json",
    "medical": "medical_sections.json",
    "blog": "blog_sections.json",
    "about": "about_sections.json",
    "careers": "careers_sections.json",
    "contact": "contact_sections.json",
    "login": "login_sections.json",
}


def _ensure_page(db: Session, slug: str) -> CmsPage | None:
    """Seed a site page from its bundled prototype export — idempotent.

    Runs once when the row is absent or still carries old html-string sections
    (no ``props`` key); admins edit the persisted row afterwards. Typed
    sections are left untouched so admin edits survive re-seeds.
    """
    seed_name = _PAGE_SEEDS.get(slug)
    if seed_name is None:
        return db.scalar(select(CmsPage).where(CmsPage.slug == slug))
    row = db.scalar(select(CmsPage).where(CmsPage.slug == slug))
    if row is not None and row.sections and section_schemas.is_typed_section(
        row.sections[0]
    ):
        return row
    try:
        seed = json.loads((_SEED_DIR / seed_name).read_text(encoding="utf-8"))
    except OSError:
        return row
    if row is None:
        row = CmsPage(
            slug=slug,
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
    if slug in _PAGE_SEEDS:
        _ensure_page(db, slug)
    page = db.scalar(
        select(CmsPage).where(CmsPage.slug == slug, CmsPage.status == CmsStatus.published)
    )
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return CmsPageOut.model_validate(page)


@router.get("/site-chrome")
def get_site_chrome() -> dict[str, Any]:
    """Shared site chrome (navbar + footer) for the common layout.

    Public, unauthenticated, no DB row — the chrome is a bundled JSON seed so
    every site page renders the same Navbar/Footer without each CMS page
    having to repeat nav/footer sections. Admins edit the seed file directly.
    """
    try:
        data: dict[str, Any] = json.loads(_SEED_CHROME.read_text(encoding="utf-8"))
        return data
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Site chrome seed missing",
        ) from exc


_POST_LOAD = (
    selectinload(CmsPost.author_obj).selectinload(CmsAuthor.avatar),
    selectinload(CmsPost.category_obj),
    selectinload(CmsPost.hero_media),
)


@router.get("/posts", response_model=Page[CmsPostOut])
def list_published_posts(
    pagination: Pagination = Depends(),
    category: str | None = Query(default=None),
    featured: bool | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Page[CmsPostOut]:
    query = (
        select(CmsPost)
        .options(*_POST_LOAD)
        .where(CmsPost.status == CmsStatus.published)
    )
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


def _related_posts(db: Session, post: CmsPost, limit: int = 3) -> list[CmsPost]:
    """Newest published posts in the same category, back-filled with the
    newest published overall so the rail always returns up to ``limit``.

    FK match is preferred; legacy rows without category_id fall back to the
    denormalized ``category`` text.
    """
    base = (
        select(CmsPost)
        .options(*_POST_LOAD)
        .where(CmsPost.status == CmsStatus.published, CmsPost.id != post.id)
    )
    related: list[CmsPost] = []
    if post.category_id is not None:
        related = list(
            db.scalars(
                base.where(CmsPost.category_id == post.category_id)
                .order_by(CmsPost.published_at.desc().nullslast())
                .limit(limit)
            ).all()
        )
    elif post.category:
        related = list(
            db.scalars(
                base.where(CmsPost.category == post.category)
                .order_by(CmsPost.published_at.desc().nullslast())
                .limit(limit)
            ).all()
        )
    if len(related) < limit:
        exclude = {r.id for r in related} | {post.id}
        related += list(
            db.scalars(
                base.where(CmsPost.id.notin_(exclude))
                .order_by(CmsPost.published_at.desc().nullslast())
                .limit(limit - len(related))
            ).all()
        )
    return related


@router.get("/posts/{slug}", response_model=CmsPostDetailOut)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)) -> CmsPostDetailOut:
    post = db.scalar(
        select(CmsPost)
        .options(*_POST_LOAD)
        .where(CmsPost.slug == slug, CmsPost.status == CmsStatus.published)
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    out = CmsPostDetailOut.model_validate(post)
    out.related_posts = [
        CmsPostOut.model_validate(r) for r in _related_posts(db, post)
    ]
    return out


@router.get("/blog/categories", response_model=list[BlogCategoryOut])
def list_blog_categories(db: Session = Depends(get_db)) -> list[BlogCategoryOut]:
    """Categories that have ≥1 published post — the public filter rail.

    Legacy posts carrying only the denormalized ``category`` text (no FK)
    are excluded by design — the slug must come from the entity.
    """
    rows = db.execute(
        select(CmsCategory.name, CmsCategory.slug, func.count(CmsPost.id))
        .join(CmsPost, CmsPost.category_id == CmsCategory.id)
        .where(CmsPost.status == CmsStatus.published)
        .group_by(CmsCategory.id, CmsCategory.name, CmsCategory.slug)
        .order_by(CmsCategory.name)
    ).all()
    return [
        BlogCategoryOut(name=name, slug=slug, post_count=count)
        for name, slug, count in rows
    ]
