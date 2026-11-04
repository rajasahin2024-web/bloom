"""Mail provisioning schemas (TEC-184)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import MailboxStatus


class AvailabilityOut(BaseModel):
    """Debounced username check on /login?mode=signup.

    `available` is None (not False) when the provider can't be reached — the
    check is advisory; the DB unique constraint + worker stay authoritative.
    """

    localpart: str
    available: bool | None
    reason: str  # available | taken | invalid | reserved | unavailable


class MailboxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    localpart: str
    address: str
    status: MailboxStatus
    quota_mb: int
    provisioned_at: datetime | None
    last_error: str | None
    attempts: int
    created_at: datetime
    updated_at: datetime


class MailboxRetryIn(BaseModel):
    """Optional body for POST /api/admin/mailboxes/{id}/retry (TEC-187).

    `mail_secret` is purged when a row fails, so retrying a failed row needs
    fresh credentials: the admin supplies a new mailbox password and only its
    argon2id hash is stored — cleared again on the next terminal outcome.
    Supplying it on a row that still holds a secret replaces the stored hash.
    """

    mail_password: str | None = Field(default=None, min_length=8, max_length=128)
