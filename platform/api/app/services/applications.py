"""Application service — idempotent create + WhatsApp alert dispatch."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.integrations.waise import ApplicationNotifier
from app.models.application import Application
from app.models.enums import ApplicationStage
from app.schemas.application import ApplicationCreateIn

logger = logging.getLogger(__name__)


def _next_ref(db: Session) -> str:
    seq = db.scalar(text("SELECT nextval('application_ref_seq')"))
    return f"BL-APP-{10000 + int(seq)}"


def create_application(
    db: Session,
    payload: ApplicationCreateIn,
    notifier: ApplicationNotifier,
) -> tuple[Application, str]:
    """Store the application, then fire the WhatsApp alert via the notifier adapter.

    Idempotent: a repeated `idempotency_key` returns the existing row with no
    duplicate insert and no second alert. The notification runs after the row
    commits so the DB transaction never spans a network call.
    """
    if payload.idempotency_key:
        existing = db.scalar(
            select(Application).where(
                Application.idempotency_key == payload.idempotency_key
            )
        )
        if existing is not None:
            return existing, "skipped" if existing.alert_sent_at is None else "sent"

    application = Application(
        ref=_next_ref(db),
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        country=payload.country,
        vacancy=payload.vacancy,
        role_title=payload.role_title,
        years=payload.years,
        examiner=payload.examiner,
        office=payload.office,
        office_name=payload.office_name,
        cv=payload.cv,
        note=payload.note,
        source=payload.source,
        idempotency_key=payload.idempotency_key,
        stage=ApplicationStage.applied,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    try:
        notifier.send_application_alert(application)
    except Exception as exc:  # noqa: BLE001 - alert failure must not fail the write
        logger.warning("application alert failed ref=%s error=%s", application.ref, exc)
        application.alert_error = str(exc)[:1000]
        db.commit()
        return application, "failed"

    application.alert_sent_at = datetime.now(UTC)
    db.commit()
    db.refresh(application)
    return application, "sent"


def get_application(db: Session, application_id: uuid.UUID) -> Application | None:
    return db.get(Application, application_id)
