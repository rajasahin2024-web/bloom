"""CMS admin router — CRUD for pages, posts and media metadata.

All endpoints require the admin role. Public read access lives in
`routers/content.py` (published content only, keyed by slug).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_admin
from app.models.cms import CmsMedia, CmsPage, CmsPost
from app.models.enums import CmsStatus
from app.models.user import User
from app.schemas.cms import (
    CmsMediaIn,
    CmsMediaOut,
    CmsMediaPatch,
    CmsPageIn,
    CmsPageOut,
    CmsPagePatch,
    CmsPostIn,
    CmsPostOut,
    CmsPostPatch,
)
from app.schemas.common import Page, Pagination

router = APIRouter(
    prefix="/api/cms",
    tags=["cms"],
    dependencies=[Depends(require_admin)],
)

ModelT = TypeVar("ModelT", CmsPage, CmsPost, CmsMedia)
InT = TypeVar("InT", CmsPageIn, CmsPostIn, CmsMediaIn)
PatchT = TypeVar("PatchT", CmsPagePatch, CmsPostPatch, CmsMediaPatch)


def _list(
    db: Session,
    model: type[ModelT],
    pagination: Pagination,
    status_filter: CmsStatus | None,
) -> tuple[list[ModelT], int]:
    query = select(model)
    if status_filter is not None and hasattr(model, "status"):
        query = query.where(model.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(model.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return list(items), total


def _get_or_404(db: Session, model: type[ModelT], row_id: uuid.UUID) -> ModelT:
    row = db.get(model, row_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row


def _create(db: Session, model: type[ModelT], payload: InT, user: User) -> ModelT:
    row = model(**payload.model_dump())
    if hasattr(row, "created_by_id"):
        row.created_by_id = user.id
    if isinstance(row, CmsMedia):
        row.uploaded_by_id = user.id
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _patch(db: Session, row: ModelT, payload: PatchT, user: User) -> ModelT:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    if hasattr(row, "updated_by_id"):
        row.updated_by_id = user.id
    if (
        getattr(row, "status", None) == CmsStatus.published
        and getattr(row, "published_at", None) is None
    ):
        row.published_at = datetime.now(UTC)  # type: ignore[attr-defined]
    db.commit()
    db.refresh(row)
    return row


def _delete(db: Session, row: ModelT) -> None:
    db.delete(row)
    db.commit()


# ── Pages ─────────────────────────────────────────────────────────────────

@router.get("/pages", response_model=Page[CmsPageOut])
def list_pages(
    pagination: Pagination = Depends(),
    status_filter: CmsStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> Page[CmsPageOut]:
    items, total = _list(db, CmsPage, pagination, status_filter)
    return Page(
        items=[CmsPageOut.model_validate(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("/pages", status_code=status.HTTP_201_CREATED, response_model=CmsPageOut)
def create_page(
    payload: CmsPageIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsPageOut:
    if payload.status == CmsStatus.published and payload.published_at is None:
        payload.published_at = datetime.now(UTC)
    return CmsPageOut.model_validate(_create(db, CmsPage, payload, user))


@router.get("/pages/{page_id}", response_model=CmsPageOut)
def get_page(page_id: uuid.UUID, db: Session = Depends(get_db)) -> CmsPageOut:
    return CmsPageOut.model_validate(_get_or_404(db, CmsPage, page_id))


@router.patch("/pages/{page_id}", response_model=CmsPageOut)
def patch_page(
    page_id: uuid.UUID,
    payload: CmsPagePatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsPageOut:
    return CmsPageOut.model_validate(
        _patch(db, _get_or_404(db, CmsPage, page_id), payload, user)
    )


@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_page(page_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    _delete(db, _get_or_404(db, CmsPage, page_id))


# ── Posts ─────────────────────────────────────────────────────────────────

@router.get("/posts", response_model=Page[CmsPostOut])
def list_posts(
    pagination: Pagination = Depends(),
    status_filter: CmsStatus | None = Query(default=None, alias="status"),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Page[CmsPostOut]:
    query = select(CmsPost)
    if status_filter is not None:
        query = query.where(CmsPost.status == status_filter)
    if category is not None:
        query = query.where(CmsPost.category == category)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(CmsPost.published_at.desc().nullslast(), CmsPost.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[CmsPostOut.model_validate(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("/posts", status_code=status.HTTP_201_CREATED, response_model=CmsPostOut)
def create_post(
    payload: CmsPostIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsPostOut:
    if payload.hero_media_id is not None:
        _get_or_404(db, CmsMedia, payload.hero_media_id)
    if payload.status == CmsStatus.published and payload.published_at is None:
        payload.published_at = datetime.now(UTC)
    return CmsPostOut.model_validate(_create(db, CmsPost, payload, user))


@router.get("/posts/{post_id}", response_model=CmsPostOut)
def get_post(post_id: uuid.UUID, db: Session = Depends(get_db)) -> CmsPostOut:
    return CmsPostOut.model_validate(_get_or_404(db, CmsPost, post_id))


@router.patch("/posts/{post_id}", response_model=CmsPostOut)
def patch_post(
    post_id: uuid.UUID,
    payload: CmsPostPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsPostOut:
    if payload.hero_media_id is not None:
        _get_or_404(db, CmsMedia, payload.hero_media_id)
    return CmsPostOut.model_validate(
        _patch(db, _get_or_404(db, CmsPost, post_id), payload, user)
    )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    _delete(db, _get_or_404(db, CmsPost, post_id))


# ── Media ─────────────────────────────────────────────────────────────────

@router.get("/media", response_model=Page[CmsMediaOut])
def list_media(
    pagination: Pagination = Depends(),
    db: Session = Depends(get_db),
) -> Page[CmsMediaOut]:
    items, total = _list(db, CmsMedia, pagination, None)
    return Page(
        items=[CmsMediaOut.model_validate(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("/media", status_code=status.HTTP_201_CREATED, response_model=CmsMediaOut)
def create_media(
    payload: CmsMediaIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsMediaOut:
    return CmsMediaOut.model_validate(_create(db, CmsMedia, payload, user))


@router.get("/media/{media_id}", response_model=CmsMediaOut)
def get_media(media_id: uuid.UUID, db: Session = Depends(get_db)) -> CmsMediaOut:
    return CmsMediaOut.model_validate(_get_or_404(db, CmsMedia, media_id))


@router.patch("/media/{media_id}", response_model=CmsMediaOut)
def patch_media(
    media_id: uuid.UUID,
    payload: CmsMediaPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsMediaOut:
    return CmsMediaOut.model_validate(
        _patch(db, _get_or_404(db, CmsMedia, media_id), payload, user)
    )


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(media_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    _delete(db, _get_or_404(db, CmsMedia, media_id))
