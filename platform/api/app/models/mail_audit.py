"""Mail admin audit trail (TEC-188, schema pre-approved on the issue).

One row per admin mutation on the mail-engine surface: mailbox create /
suspend / unsuspend / reset-password / test, engine test-send, and queue
retry. `detail` carries outcome metadata only — never passwords, secrets,
or tokens (credential material is transient by contract).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MailAdminAudit(Base):
    __tablename__ = "mail_admin_audit"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Who acted. Nullable + SET NULL so the trail survives admin-user
    # deletion — an audit row that vanishes with its actor is no audit.
    admin_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    # e.g. "mailbox.create" | "mailbox.suspend" | "mailbox.unsuspend" |
    # "mailbox.reset_password" | "mailbox.test" | "engine.test_send" |
    # "queue.retry"
    action: Mapped[str] = mapped_column(String(64))
    # Mailbox row id, address, "engine", or queue target — flat string so
    # the row stays readable without joins.
    target: Mapped[str] = mapped_column(String(255))
    detail: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
