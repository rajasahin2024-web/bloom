"""Mailbox mirror model — platform-side view of provisioned mailboxes (TEC-184).

One row per academy mailbox (`<localpart>@MAIL_DOMAIN`), created in the same
transaction as the signup so the account and its pending mailbox are atomic.
The Redis worker drives `pending → queued → provisioning → active | failed`;
`suspended` is reachable via `mail_admin` actions.

The row is the source of truth for retries: the queue payload carries only the
mailbox id, so a worker crash or a failed enqueue self-heals via the sweeper —
no secrets in Redis. `mail_secret` holds the argon2id hash of the student's
chosen mailbox password between enqueue and successful provisioning, then is
cleared (same risk class as `users.password_hash`, shorter-lived).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import MailboxStatus

_enum_values = lambda e: [m.value for m in e]  # noqa: E731 - store .value not .name


class Mailbox(Base):
    __tablename__ = "mailboxes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # One mailbox per user; cascade with the account.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    # Idempotency key for create_mailbox — unique at the DB level so racing
    # signups can't claim the same address.
    localpart: Mapped[str] = mapped_column(CITEXT, unique=True, index=True)
    status: Mapped[MailboxStatus] = mapped_column(
        Enum(
            MailboxStatus,
            name="mailbox_status",
            values_callable=_enum_values,
            validate_strings=True,
        ),
        default=MailboxStatus.pending,
        index=True,
    )
    quota_mb: Mapped[int] = mapped_column(Integer)
    # Transient: argon2id hash of the mailbox password, cleared once the
    # provider confirms creation. NULL for suspended/failed replays after
    # success — the hash is not needed post-provisioning.
    mail_secret: Mapped[str | None] = mapped_column(String(255))
    provisioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(500))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
