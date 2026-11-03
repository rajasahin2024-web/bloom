"""CMS admin router — CRUD for pages, posts and media metadata.

All endpoints require the admin role. Public read access lives in
`routers/content.py` (published content only, keyed by slug).
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from app.core.database import get_db
from app.deps import require_admin
from app.models.cms import CmsAuthor, CmsCategory, CmsMedia, CmsPage, CmsPost
from app.models.enums import CmsStatus
from app.models.user import User
from app.schemas.cms import (
    CmsAuthorIn,
    CmsAuthorOut,
    CmsAuthorPatch,
    CmsCategoryIn,
    CmsCategoryOut,
    CmsCategoryPatch,
    CmsMediaIn,
    CmsMediaOut,
    CmsMediaPatch,
    CmsMediaUploadIn,
    CmsPageIn,
    CmsPageOut,
    CmsPagePatch,
    CmsPostIn,
    CmsPostOut,
    CmsPostPatch,
)
from app.schemas.common import Page, Pagination
from app.services import media as media_service
from app.services import sanitize, section_schemas
from app.services import storage as storage_service

router = APIRouter(
    prefix="/api/cms",
    tags=["cms"],
    dependencies=[Depends(require_admin)],
)

ModelT = TypeVar("ModelT", CmsPage, CmsPost, CmsMedia, CmsAuthor, CmsCategory)
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
        # Storage keys are server-generated — caller-supplied keys must match
        # the servable shape or the public /api/media/serve endpoint would
        # expose whatever the row points at.
        cfg = storage_service.resolve_config(db)
        if not media_service.is_servable_key(row.storage_key, cfg.prefix_media):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="storage_key must be a server-generated media key",
            )
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


def _ilike_pattern(q: str) -> str:
    """Escape LIKE wildcards in a user-supplied search term."""
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def _ensure_slug_free(
    db: Session,
    model: type[ModelT],
    slug: str,
    exclude_id: uuid.UUID | None = None,
) -> None:
    query = select(model.id).where(model.slug == slug)  # type: ignore[attr-defined]
    if exclude_id is not None:
        query = query.where(model.id != exclude_id)
    if db.scalar(query) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="slug_taken"
        )


def _commit_or_slug_conflict(db: Session) -> None:
    """Race guard: the pre-check above can still lose to a concurrent insert."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="slug_taken"
        ) from exc


def _post_load_options() -> tuple[ExecutableOption, ExecutableOption]:
    """Eager loads for CmsPostOut serialization — author_avatar_url walks
    author_obj.avatar; without selectinload each row would lazy-load (N+1)."""
    return (
        selectinload(CmsPost.author_obj).selectinload(CmsAuthor.avatar),
        selectinload(CmsPost.category_obj),
    )


def _apply_post_fks(
    db: Session, post: CmsPost, fields: Iterable[str]
) -> None:
    """Resolve taxonomy FKs and denormalize entity names into the text
    columns. ``fields`` = explicitly-provided field names (model_fields_set).
    """
    fields = set(fields)
    if "author_id" in fields:
        post.author = (
            _get_or_404(db, CmsAuthor, post.author_id).name
            if post.author_id is not None
            else None
        )
    if "category_id" in fields:
        post.category = (
            _get_or_404(db, CmsCategory, post.category_id).name
            if post.category_id is not None
            else None
        )
    # Revalidate whenever the pair could drift: a changed category_id can
    # orphan an untouched subcategory_id.
    if "subcategory_id" in fields or "category_id" in fields:
        if post.subcategory_id is None:
            if "subcategory_id" in fields:
                post.subcategory = None
        else:
            if post.category_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="subcategory_id requires category_id",
                )
            sub = _get_or_404(db, CmsCategory, post.subcategory_id)
            if sub.parent_id != post.category_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="subcategory_id must reference a child of category_id",
                )
            post.subcategory = sub.name


def _validate_category_parent(
    db: Session, parent_id: uuid.UUID | None, self_id: uuid.UUID | None = None
) -> None:
    """One level of nesting only: a parent may not itself have a parent."""
    if parent_id is None:
        return
    if self_id is not None and parent_id == self_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="category cannot be its own parent",
        )
    parent = _get_or_404(db, CmsCategory, parent_id)
    if parent.parent_id is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="parent_id must reference a top-level category",
        )


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
    if payload.sections is not None:
        errors = section_schemas.validate_sections(payload.sections)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Section validation failed", "errors": errors},
            )
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
    if payload.sections is not None:
        errors = section_schemas.validate_sections(payload.sections)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "Section validation failed", "errors": errors},
            )
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
    query = select(CmsPost).options(*_post_load_options())
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
    _ensure_slug_free(db, CmsPost, payload.slug)
    if payload.status == CmsStatus.published and payload.published_at is None:
        payload.published_at = datetime.now(UTC)
    row = CmsPost(**payload.model_dump())
    _apply_post_fks(db, row, payload.model_fields_set)
    row.body = sanitize.clean_html(row.body)
    if row.read_minutes is None:
        row.read_minutes = sanitize.read_minutes(row.body)
    row.created_by_id = user.id
    db.add(row)
    _commit_or_slug_conflict(db)
    db.refresh(row)
    return CmsPostOut.model_validate(row)


@router.get("/posts/{post_id}", response_model=CmsPostOut)
def get_post(post_id: uuid.UUID, db: Session = Depends(get_db)) -> CmsPostOut:
    post = db.scalar(
        select(CmsPost).options(*_post_load_options()).where(CmsPost.id == post_id)
    )
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return CmsPostOut.model_validate(post)


@router.patch("/posts/{post_id}", response_model=CmsPostOut)
def patch_post(
    post_id: uuid.UUID,
    payload: CmsPostPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsPostOut:
    if payload.hero_media_id is not None:
        _get_or_404(db, CmsMedia, payload.hero_media_id)
    post = _get_or_404(db, CmsPost, post_id)
    if payload.slug is not None:
        _ensure_slug_free(db, CmsPost, payload.slug, exclude_id=post_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    _apply_post_fks(db, post, payload.model_fields_set)
    if "body" in payload.model_fields_set:
        post.body = sanitize.clean_html(post.body)
    if post.read_minutes is None:
        post.read_minutes = sanitize.read_minutes(post.body)
    post.updated_by_id = user.id
    if post.status == CmsStatus.published and post.published_at is None:
        post.published_at = datetime.now(UTC)
    _commit_or_slug_conflict(db)
    db.refresh(post)
    return CmsPostOut.model_validate(post)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    _delete(db, _get_or_404(db, CmsPost, post_id))


# ── Authors ───────────────────────────────────────────────────────────────


@router.get("/authors", response_model=Page[CmsAuthorOut])
def list_authors(
    pagination: Pagination = Depends(),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> Page[CmsAuthorOut]:
    query = select(CmsAuthor)
    if q:
        pattern = _ilike_pattern(q)
        query = query.where(
            or_(
                CmsAuthor.name.ilike(pattern, escape="\\"),
                CmsAuthor.slug.ilike(pattern, escape="\\"),
            )
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(CmsAuthor.name.asc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[CmsAuthorOut.model_validate(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post(
    "/authors", status_code=status.HTTP_201_CREATED, response_model=CmsAuthorOut
)
def create_author(
    payload: CmsAuthorIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsAuthorOut:
    if payload.avatar_media_id is not None:
        _get_or_404(db, CmsMedia, payload.avatar_media_id)
    _ensure_slug_free(db, CmsAuthor, payload.slug)
    row = CmsAuthor(**payload.model_dump())
    row.created_by_id = user.id
    db.add(row)
    _commit_or_slug_conflict(db)
    db.refresh(row)
    return CmsAuthorOut.model_validate(row)


@router.get("/authors/{author_id}", response_model=CmsAuthorOut)
def get_author(author_id: uuid.UUID, db: Session = Depends(get_db)) -> CmsAuthorOut:
    return CmsAuthorOut.model_validate(_get_or_404(db, CmsAuthor, author_id))


@router.patch("/authors/{author_id}", response_model=CmsAuthorOut)
def patch_author(
    author_id: uuid.UUID,
    payload: CmsAuthorPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsAuthorOut:
    if payload.avatar_media_id is not None:
        _get_or_404(db, CmsMedia, payload.avatar_media_id)
    if payload.slug is not None:
        _ensure_slug_free(db, CmsAuthor, payload.slug, exclude_id=author_id)
    row = _get_or_404(db, CmsAuthor, author_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.updated_by_id = user.id
    _commit_or_slug_conflict(db)
    db.refresh(row)
    return CmsAuthorOut.model_validate(row)


@router.delete("/authors/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_author(author_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    # posts.author_id is FK SET NULL — the denormalized byline text stays.
    _delete(db, _get_or_404(db, CmsAuthor, author_id))


# ── Categories ────────────────────────────────────────────────────────────


@router.get("/categories", response_model=list[CmsCategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[CmsCategoryOut]:
    """Flat list ordered parent-then-child — FE builds the tree itself.

    COALESCE(parent_id, id) groups each child with its parent; within a
    group the parent (parent_id IS NULL) sorts first, then children by name.
    """
    items = db.scalars(
        select(CmsCategory).order_by(
            func.coalesce(CmsCategory.parent_id, CmsCategory.id),
            CmsCategory.parent_id.isnot(None),
            CmsCategory.name,
        )
    ).all()
    return [CmsCategoryOut.model_validate(r) for r in items]


@router.post(
    "/categories",
    status_code=status.HTTP_201_CREATED,
    response_model=CmsCategoryOut,
)
def create_category(
    payload: CmsCategoryIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsCategoryOut:
    _validate_category_parent(db, payload.parent_id)
    _ensure_slug_free(db, CmsCategory, payload.slug)
    row = CmsCategory(**payload.model_dump())
    db.add(row)
    _commit_or_slug_conflict(db)
    db.refresh(row)
    return CmsCategoryOut.model_validate(row)


@router.patch("/categories/{category_id}", response_model=CmsCategoryOut)
def patch_category(
    category_id: uuid.UUID,
    payload: CmsCategoryPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsCategoryOut:
    if "parent_id" in payload.model_fields_set:
        _validate_category_parent(db, payload.parent_id, self_id=category_id)
    if payload.slug is not None:
        _ensure_slug_free(db, CmsCategory, payload.slug, exclude_id=category_id)
    row = _get_or_404(db, CmsCategory, category_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    _commit_or_slug_conflict(db)
    db.refresh(row)
    return CmsCategoryOut.model_validate(row)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    row = _get_or_404(db, CmsCategory, category_id)
    child = db.scalar(
        select(CmsCategory.id).where(CmsCategory.parent_id == category_id).limit(1)
    )
    if child is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="category_has_children",
        )
    # posts.category_id / subcategory_id are FK SET NULL — denormalized text stays.
    _delete(db, row)


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


@router.post(
    "/media/upload", status_code=status.HTTP_201_CREATED, response_model=CmsMediaOut
)
def upload_media(
    payload: CmsMediaUploadIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> CmsMediaOut:
    try:
        media = media_service.save_cms_media(
            payload.data_url, payload.filename, payload.mime_type, user.id, db
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    if payload.alt_text:
        media.alt_text = payload.alt_text
        db.commit()
        db.refresh(media)
    return CmsMediaOut.model_validate(media)


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
    _get_or_404(db, CmsMedia, media_id)
    media_service.delete_cms_media(media_id, db)
