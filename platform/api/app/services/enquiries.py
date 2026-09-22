"""Enquiry service — idempotent create + WhatsApp alert dispatch."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.integrations.waise import EnquiryNotifier
from app.models.enquiry import Enquiry
from app.models.enums import EnquiryStatus
from app.schemas.enquiry import EnquiryCreateIn

logger = logging.getLogger(__name__)


def _next_ref(db: Session) -> str:
    seq = db.scalar(text("SELECT nextval('enquiry_ref_seq')"))
    return f"ENQ-{10000 + int(seq)}"


def create_enquiry(
    db: Session,
    payload: EnquiryCreateIn,
    notifier: EnquiryNotifier,
) -> tuple[Enquiry, str]:
    """Store the enquiry, then fire the WhatsApp alert via the notifier adapter.

    Idempotent: a repeated `idempotency_key` returns the existing row with no
    duplicate insert and no second alert. The notification runs after the row
    commits so the DB transaction never spans a network call.
    """
    if payload.idempotency_key:
        existing = db.scalar(
            select(Enquiry).where(Enquiry.idempotency_key == payload.idempotency_key)
        )
        if existing is not None:
            return existing, "skipped" if existing.alert_sent_at is None else "sent"

    enquiry = Enquiry(
        ref=_next_ref(db),
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        country=payload.country,
        interest=payload.interest,
        band=payload.band,
        target=payload.target,
        message=payload.message,
        source=payload.source,
        idempotency_key=payload.idempotency_key,
        status=EnquiryStatus.new,
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    try:
        notifier.send_enquiry_alert(enquiry)
    except Exception as exc:  # noqa: BLE001 - alert failure must not fail the write
        logger.warning("enquiry alert failed ref=%s error=%s", enquiry.ref, exc)
        enquiry.alert_error = str(exc)[:1000]
        db.commit()
        return enquiry, "failed"

    enquiry.alert_sent_at = datetime.now(UTC)
    db.commit()
    db.refresh(enquiry)
    return enquiry, "sent"


def get_enquiry(db: Session, enquiry_id: uuid.UUID) -> Enquiry | None:
    return db.get(Enquiry, enquiry_id)
