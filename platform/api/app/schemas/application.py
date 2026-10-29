"""Application schemas — public create + admin hiring pipeline."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import ApplicationStage


class ApplicationCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    country: str | None = Field(default=None, max_length=100)
    vacancy: str | None = Field(default=None, max_length=50)
    role_title: str | None = Field(default=None, max_length=200)
    years: int | None = Field(default=None, ge=0, le=50)
    examiner: str | None = Field(default=None, max_length=100)
    office: str | None = Field(default=None, max_length=50)
    office_name: str | None = Field(default=None, max_length=200)
    cv: str | None = Field(default=None, max_length=500)
    note: str | None = Field(default=None, max_length=5000)
    source: str = Field(default="careers page", max_length=50)
    idempotency_key: str | None = Field(default=None, max_length=100)


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ref: str
    name: str
    email: str
    phone: str | None
    country: str | None
    vacancy: str | None
    role_title: str | None
    years: int | None
    examiner: str | None
    office: str | None
    office_name: str | None
    cv: str | None
    note: str | None
    stage: ApplicationStage
    source: str
    alert_sent_at: datetime | None
    created_at: datetime


class ApplicationCreateOut(BaseModel):
    application: ApplicationOut
    # pending | sent | failed | skipped — the WAISE adapter's outcome.
    alert: str


class ApplicationUpdateIn(BaseModel):
    stage: ApplicationStage
