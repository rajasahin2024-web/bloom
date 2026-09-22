"""Enquiry model — website consultation requests.

Fields mirror the prototype contact form (`FMAHTML/contact.html`) and the
WhatsApp alert template: name, email, phone, country, interest, band, target,
msg → stored as `message`, plus a human-readable `ref` and a lifecycle status.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import EnquiryStatus
from app.models.user import _enum_values


class Enquiry(Base):
    __tablename__ = "enquiries"
    __table_args__ = (Index("ix_enquiries_status_created", "status", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ref: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(CITEXT)
    phone: Mapped[str | None] = mapped_column(String(32))
    country: Mapped[str | None] = mapped_column(String(100))
    interest: Mapped[str | None] = mapped_column(String(100))
    band: Mapped[str | None] = mapped_column(String(20))
    target: Mapped[str | None] = mapped_column(String(50))
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[EnquiryStatus] = mapped_column(
        Enum(EnquiryStatus, name="enquiry_status", values_callable=_enum_values),
        default=EnquiryStatus.new,
        index=True,
    )
    # Idempotent create: clients may send a key; retries with the same key
    # return the existing row instead of a duplicate.
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True)
    # WhatsApp/WAISE alert bookkeeping
    alert_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    alert_error: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(50), default="website")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
