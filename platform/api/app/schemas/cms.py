"""CMS schemas — pages, posts, media metadata."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CmsStatus


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


class CmsPostIn(BaseModel):
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9][a-z0-9\-_]*$")
    title: str = Field(min_length=1, max_length=300)
    category: str | None = Field(default=None, max_length=100)
    author: str | None = Field(default=None, max_length=200)
    excerpt: str | None = None
    body: str = ""
    tags: list[str] = Field(default_factory=list, max_length=20)
    read_minutes: int | None = Field(default=None, ge=0, le=1000)
    hero_media_id: uuid.UUID | None = None
    featured: bool = False
    status: CmsStatus = CmsStatus.draft
    published_at: datetime | None = None


class CmsPostPatch(BaseModel):
    slug: str | None = Field(
        default=None, min_length=1, max_length=200, pattern=r"^[a-z0-9][a-z0-9\-_]*$"
    )
    title: str | None = Field(default=None, min_length=1, max_length=300)
    category: str | None = Field(default=None, max_length=100)
    author: str | None = Field(default=None, max_length=200)
    excerpt: str | None = None
    body: str | None = None
    tags: list[str] | None = Field(default=None, max_length=20)
    read_minutes: int | None = Field(default=None, ge=0, le=1000)
    hero_media_id: uuid.UUID | None = None
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
    excerpt: str | None
    body: str
    tags: list[str]
    read_minutes: int | None
    hero_media_id: uuid.UUID | None
    featured: bool
    status: CmsStatus
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


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
