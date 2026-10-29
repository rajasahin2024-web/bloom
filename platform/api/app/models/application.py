"""Application model — careers page job applications.

Fields mirror the prototype careers form (`prototype/careers.html`,
`sendApplication`): name, email, phone, country, vacancy/role title, years,
examiner status, office, CV link and cover note — plus a human-readable
`ref` (BL-APP-…) and the hiring-pipeline `stage` the HR admin panel tracks.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import ApplicationStage
from app.models.user import _enum_values


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (Index("ix_applications_stage_created", "stage", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ref: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(CITEXT)
    phone: Mapped[str | None] = mapped_column(String(32))
    country: Mapped[str | None] = mapped_column(String(100))
    # Vacancy id from the roles list (e.g. "v1"); NULL for speculative applications.
    vacancy: Mapped[str | None] = mapped_column(String(50))
    role_title: Mapped[str | None] = mapped_column(String(200))
    years: Mapped[int | None] = mapped_column(Integer)
    examiner: Mapped[str | None] = mapped_column(String(100))
    office: Mapped[str | None] = mapped_column(String(50))
    office_name: Mapped[str | None] = mapped_column(String(200))
    cv: Mapped[str | None] = mapped_column(String(500))
    note: Mapped[str | None] = mapped_column(Text)
    stage: Mapped[ApplicationStage] = mapped_column(
        Enum(ApplicationStage, name="application_stage", values_callable=_enum_values),
        default=ApplicationStage.applied,
        index=True,
    )
    # Idempotent create: clients may send a key; retries with the same key
    # return the existing row instead of a duplicate.
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True)
    # WhatsApp/WAISE alert bookkeeping
    alert_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    alert_error: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(50), default="careers page")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
