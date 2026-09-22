"""Enquiry schemas — public create + admin inbox management."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import EnquiryStatus


class EnquiryCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=100)
    interest: str | None = Field(default=None, max_length=100)
    band: str | None = Field(default=None, max_length=20)
    target: str | None = Field(default=None, max_length=50)
    message: str | None = Field(default=None, max_length=5000)
    source: str = Field(default="website", max_length=50)
    idempotency_key: str | None = Field(default=None, max_length=100)


class EnquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ref: str
    name: str
    email: str
    phone: str | None
    country: str | None
    interest: str | None
    band: str | None
    target: str | None
    message: str | None
    status: EnquiryStatus
    source: str
    alert_sent_at: datetime | None
    created_at: datetime


class EnquiryCreateOut(BaseModel):
    enquiry: EnquiryOut
    # pending | sent | failed | skipped — the WAISE adapter's outcome.
    alert: str


class EnquiryUpdateIn(BaseModel):
    status: EnquiryStatus
