"""Mail provisioning + admin engine schemas (TEC-184, TEC-188).

The admin engine surface (`/api/admin/mail/*`) serializes camelCase —
field names follow the frozen contract block verbatim (`smtpAuth`,
`apiReachable`, `checkedAt`, `messageId`, …); the mailbox-mirror family
keeps the existing snake_case shape.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

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
    # NULL for admin-provisioned standalone mailboxes (TEC-188).
    user_id: uuid.UUID | None
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


# ── Admin mailbox actions + engine surface (TEC-188, contracts/mail-admin.yaml)


class MailboxCreateIn(BaseModel):
    """POST /api/admin/mailboxes — standalone mailbox provisioning."""

    model_config = ConfigDict(populate_by_name=True)

    localpart: str = Field(min_length=1, max_length=64)
    # Transient: sent to the engine pre-hashed, never stored or logged.
    password: str = Field(min_length=8, max_length=128)
    quota_mb: int | None = Field(default=None, alias="quotaMb", ge=1)


class MailboxStatusOut(BaseModel):
    status: str


class ResetPasswordOut(BaseModel):
    """The generated password — returned exactly once, never persisted."""

    password: str


class MailboxTestIn(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class MailboxTestOut(_CamelModel):
    smtp_auth: bool = Field(serialization_alias="smtpAuth")
    imap: bool
    error: str | None


class ListenerOut(BaseModel):
    name: str
    port: int
    ok: bool


class TlsOut(_CamelModel):
    host: str
    expires_at: datetime = Field(serialization_alias="expiresAt")
    days_remaining: int = Field(serialization_alias="daysRemaining")


class QueueCountsOut(BaseModel):
    active: int
    deferred: int


class EngineStatusOut(_CamelModel):
    engine: Literal["stalwart"] = "stalwart"
    checked_at: datetime = Field(serialization_alias="checkedAt")
    api_reachable: bool = Field(serialization_alias="apiReachable")
    listeners: list[ListenerOut]
    tls: TlsOut | None
    queue: QueueCountsOut | None


class DnsRecordOut(BaseModel):
    name: str
    expected: str
    found: str | None
    ok: bool


class DnsReportOut(_CamelModel):
    checked_at: datetime = Field(serialization_alias="checkedAt")
    records: list[DnsRecordOut]


class TestSendIn(BaseModel):
    to: EmailStr


class TestSendOut(_CamelModel):
    accepted: bool
    message_id: str | None = Field(serialization_alias="messageId")
    error: str | None


class QueueItemOut(_CamelModel):
    id: str
    return_path: str | None = Field(serialization_alias="returnPath")
    size: int | None
    created: str | None
    status: str | None
    next_retry: str | None = Field(serialization_alias="nextRetry")
    recipients: int | None


class QueueReportOut(BaseModel):
    available: bool
    items: list[QueueItemOut]
    total: int


class QueueRetryIn(BaseModel):
    ids: list[str] | None = Field(default=None, max_length=100)
    all: Literal[True] | None = None

    @model_validator(mode="after")
    def _exactly_one(self) -> QueueRetryIn:
        if self.all and self.ids:
            raise ValueError("pass either ids or all — not both")
        if not self.all and not self.ids:
            raise ValueError("pass ids or all")
        return self


class QueueRetryOut(BaseModel):
    available: bool
    retried: int
    error: str | None


class DeliveryItemOut(_CamelModel):
    id: str
    direction: str | None
    sender: str | None = Field(serialization_alias="from")
    to: list[str]
    subject: str | None
    received_at: str | None = Field(serialization_alias="receivedAt")
    status: str | None
    folder: str | None


class DeliveryReportOut(BaseModel):
    available: bool
    items: list[DeliveryItemOut]


def delivery_item_from_adapter(item: Any) -> DeliveryItemOut:
    """Adapter dataclass → contract shape (keeps the router thin)."""
    return DeliveryItemOut(
        id=item.id,
        direction=item.direction,
        sender=item.sender,
        to=item.to,
        subject=item.subject,
        received_at=item.received_at,
        status=item.status,
        folder=item.folder,
    )
