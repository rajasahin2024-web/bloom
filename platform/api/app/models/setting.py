"""Platform settings — DB-backed key/value store.

One row per setting key. A row written by an admin PATCH (`updated_by` set)
is a DB override; rows seeded at migration/first boot keep `updated_by` NULL
and are reported as env/seed defaults until an admin edits them.

`value` is nullable JSONB: NULL means "unset" — for seeded rows it is the
absence of a default, and for admin saves it is an explicit clear (e.g.
removing the logo).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB, nullable=True)
    group: Mapped[str] = mapped_column(
        "group", String(50), nullable=False, index=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
