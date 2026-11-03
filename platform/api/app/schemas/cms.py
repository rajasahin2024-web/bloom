"""CMS schemas — pages, posts, media metadata."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import CmsStatus

_SLUG = r"^[a-z0-9][a-z0-9\-_]*$"


class CmsPageIn(BaseModel):
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9][a-z0-9\-_/]*$")
    title: str = Field(min_length=1, max_length=300)
    body: str = ""
    status: CmsStatus = CmsStatus.draft
    meta_title: str | None = Field(default=None, max_length=300)
    meta_description: str | None = Field(default=None, max_length=500)
    json_ld: dict[str, Any] | None = None
    sections: list[dict[str, Any]] | None = None
    published_at: datetime | None = None


class CmsPagePatch(BaseModel):
    slug: str | None = Field(
        default=None, min_length=1, max_length=200, pattern=r"^[a-z0-9][a-z0-9\-_/]*$"
    )
    title: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = None
    status: CmsStatus | None = None
    meta_title: str | None = Field(default=None, max_length=300)
    meta_description: str | None = Field(default=None, max_length=500)
    json_ld: dict[str, Any] | None = None
    sections: list[dict[str, Any]] | None = None
    published_at: datetime | None = None


class CmsPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    body: str
    status: CmsStatus
    meta_title: str | None
    meta_description: str | None
    json_ld: dict[str, Any] | None
    sections: list[dict[str, Any]] | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CmsAuthorIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=200, pattern=_SLUG)
    role: str | None = Field(default=None, max_length=150)
    bio: str | None = None
    avatar_media_id: uuid.UUID | None = None
    email: EmailStr | None = Field(default=None, max_length=320)
    linkedin_url: str | None = Field(default=None, max_length=500)
    instagram_url: str | None = Field(default=None, max_length=500)
    twitter_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)


class CmsAuthorPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=200, pattern=_SLUG)
    role: str | None = Field(default=None, max_length=150)
    bio: str | None = None
    avatar_media_id: uuid.UUID | None = None
    email: EmailStr | None = Field(default=None, max_length=320)
    linkedin_url: str | None = Field(default=None, max_length=500)
    instagram_url: str | None = Field(default=None, max_length=500)
    twitter_url: str | None = Field(default=None, max_length=500)
    website_url: str | None = Field(default=None, max_length=500)


class CmsAuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    role: str | None
    bio: str | None
    avatar_media_id: uuid.UUID | None
    email: str | None
    linkedin_url: str | None
    instagram_url: str | None
    twitter_url: str | None
    website_url: str | None
    created_at: datetime
    updated_at: datetime


class CmsCategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(min_length=1, max_length=200, pattern=_SLUG)
    parent_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=500)


class CmsCategoryPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    slug: str | None = Field(default=None, min_length=1, max_length=200, pattern=_SLUG)
    parent_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=500)


class CmsCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    parent_id: uuid.UUID | None
    description: str | None
    created_at: datetime


class CmsPostIn(BaseModel):
    slug: str = Field(min_length=1, max_length=200, pattern=_SLUG)
    title: str = Field(min_length=1, max_length=300)
    category: str | None = Field(default=None, max_length=100)
    author: str | None = Field(default=None, max_length=200)
    subcategory: str | None = Field(default=None, max_length=100)
    excerpt: str | None = None
    body: str = ""
    tags: list[str] = Field(default_factory=list, max_length=20)
    read_minutes: int | None = Field(default=None, ge=0, le=1000)
    hero_media_id: uuid.UUID | None = None
    author_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None
    meta_title: str | None = Field(default=None, max_length=300)
    meta_description: str | None = Field(default=None, max_length=500)
    featured: bool = False
    status: CmsStatus = CmsStatus.draft
    published_at: datetime | None = None


class CmsPostPatch(BaseModel):
    slug: str | None = Field(
        default=None, min_length=1, max_length=200, pattern=_SLUG
    )
    title: str | None = Field(default=None, min_length=1, max_length=300)
    category: str | None = Field(default=None, max_length=100)
    author: str | None = Field(default=None, max_length=200)
    subcategory: str | None = Field(default=None, max_length=100)
    excerpt: str | None = None
    body: str | None = None
    tags: list[str] | None = Field(default=None, max_length=20)
    read_minutes: int | None = Field(default=None, ge=0, le=1000)
    hero_media_id: uuid.UUID | None = None
    author_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None
    meta_title: str | None = Field(default=None, max_length=300)
    meta_description: str | None = Field(default=None, max_length=500)
    featured: bool | None = None
    status: CmsStatus | None = None
    published_at: datetime | None = None


class CmsPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    category: str | None
    author: str | None
    subcategory: str | None
    excerpt: str | None
    body: str
    tags: list[str]
    read_minutes: int | None
    hero_media_id: uuid.UUID | None
    author_id: uuid.UUID | None
    category_id: uuid.UUID | None
    subcategory_id: uuid.UUID | None
    author_avatar_url: str | None
    hero_url: str | None
    meta_title: str | None
    meta_description: str | None
    featured: bool
    status: CmsStatus
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CmsPostDetailOut(CmsPostOut):
    """Public post detail — the post plus embedded entities and related."""

    author_obj: CmsAuthorOut | None
    category_obj: CmsCategoryOut | None
    related_posts: list[CmsPostOut] = Field(default_factory=list)


class BlogCategoryOut(BaseModel):
    """Public blog category roll-up — published post counts only."""

    name: str
    slug: str
    post_count: int


class CmsMediaIn(BaseModel):
    storage_key: str = Field(min_length=1, max_length=500)
    url: str = Field(min_length=1, max_length=1000)
    filename: str = Field(min_length=1, max_length=255)
    alt_text: str | None = Field(default=None, max_length=500)
    mime_type: str | None = Field(default=None, max_length=100)
    size_bytes: int | None = Field(default=None, ge=0)


class CmsMediaPatch(BaseModel):
    url: str | None = Field(default=None, min_length=1, max_length=1000)
    filename: str | None = Field(default=None, min_length=1, max_length=255)
    alt_text: str | None = Field(default=None, max_length=500)
    mime_type: str | None = Field(default=None, max_length=100)
    size_bytes: int | None = Field(default=None, ge=0)


class CmsMediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    storage_key: str
    url: str
    filename: str
    alt_text: str | None
    mime_type: str | None
    size_bytes: int | None
    uploaded_by_id: uuid.UUID | None
    created_at: datetime


class CmsMediaUploadIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    mime_type: str | None = Field(default=None, max_length=100)
    data_url: str = Field(min_length=1, max_length=2_000_000)
    alt_text: str | None = Field(default=None, max_length=500)
