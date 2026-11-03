"""CMS models — pages, blog posts and media metadata.

Field shapes mirror the FMAHTML prototype's CMS collections (`bloom-cms-data.js`)
so the public website can be ported faithfully.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import CmsStatus
from app.models.user import _enum_values


class CmsMedia(Base):
    """Media asset metadata. The binary lives in object storage; this row
    records the location plus the CMS-facing metadata (alt text etc.)."""

    __tablename__ = "cms_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    url: Mapped[str] = mapped_column(String(1000))
    filename: Mapped[str] = mapped_column(String(255))
    alt_text: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CmsPage(Base):
    """A CMS-managed site page (home, about, courses, …) with SEO plumbing."""

    __tablename__ = "cms_pages"
    __table_args__ = (Index("ix_cms_pages_status_published", "status", "published_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[CmsStatus] = mapped_column(
        Enum(CmsStatus, name="cms_status", values_callable=_enum_values),
        default=CmsStatus.draft,
        index=True,
    )
    # SEO
    meta_title: Mapped[str | None] = mapped_column(String(300))
    meta_description: Mapped[str | None] = mapped_column(String(500))
    json_ld: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # Ordered page sections for the visual site pages (home, …)
    sections: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CmsAuthor(Base):
    """Blog author entity — referenced by posts; carries byline + socials."""

    __tablename__ = "cms_authors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    role: Mapped[str | None] = mapped_column(String(150))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_media.id", ondelete="SET NULL")
    )
    email: Mapped[str | None] = mapped_column(String(320))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    instagram_url: Mapped[str | None] = mapped_column(String(500))
    twitter_url: Mapped[str | None] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(String(500))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    avatar: Mapped[CmsMedia | None] = relationship()


class CmsCategory(Base):
    """Blog category — self-referencing, max one level of nesting enforced
    at the API layer (a parent may not itself have a parent)."""

    __tablename__ = "cms_categories"
    __table_args__ = (Index("ix_cms_categories_parent_id", "parent_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_categories.id", ondelete="SET NULL")
    )
    description: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    parent: Mapped[CmsCategory | None] = relationship(remote_side=[id])


class CmsPost(Base):
    """Blog post — mirrors the prototype `blogs` collection."""

    __tablename__ = "cms_posts"
    __table_args__ = (
        Index("ix_cms_posts_status_published", "status", "published_at"),
        # Serves "related posts": status=published AND category_id=X ORDER BY
        # published_at DESC — equality on the first two, range-scan the third.
        Index(
            "ix_cms_posts_category_published",
            "category_id",
            "status",
            "published_at",
        ),
        Index("ix_cms_posts_author_id", "author_id"),
        Index("ix_cms_posts_subcategory_id", "subcategory_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    author: Mapped[str | None] = mapped_column(String(200))
    excerpt: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    read_minutes: Mapped[int | None] = mapped_column(Integer)
    hero_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_media.id", ondelete="SET NULL")
    )
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[CmsStatus] = mapped_column(
        Enum(
            CmsStatus,
            name="cms_status",
            values_callable=_enum_values,
            create_constraint=False,
        ),
        default=CmsStatus.draft,
        index=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Taxonomy FKs — names are denormalized into the text columns above on
    # write so public reads keep working without a join. SET NULL on entity
    # delete leaves the denormalized display text behind (intentional).
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_authors.id", ondelete="SET NULL")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_categories.id", ondelete="SET NULL")
    )
    subcategory_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cms_categories.id", ondelete="SET NULL")
    )
    subcategory: Mapped[str | None] = mapped_column(String(100))
    meta_title: Mapped[str | None] = mapped_column(String(300))
    meta_description: Mapped[str | None] = mapped_column(String(500))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    hero_media: Mapped[CmsMedia | None] = relationship()
    author_obj: Mapped[CmsAuthor | None] = relationship()
    category_obj: Mapped[CmsCategory | None] = relationship(
        foreign_keys=[category_id]
    )
    subcategory_obj: Mapped[CmsCategory | None] = relationship(
        foreign_keys=[subcategory_id]
    )

    @property
    def author_avatar_url(self) -> str | None:
        """Avatar URL for serialization — relies on the caller eager-loading
        ``author_obj.avatar`` (list endpoints do this via selectinload)."""
        author = self.author_obj
        if author is None or author.avatar is None:
            return None
        return author.avatar.url
