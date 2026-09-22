"""Enquiries router — public intake + admin inbox.

`POST /api/enquiries` is the website contact form's backend: it stores the
enquiry and fires the WhatsApp alert through the WAISE adapter (stub until
TEC-64 lands a real client).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_admin
from app.integrations.waise import EnquiryNotifier, get_enquiry_notifier
from app.models.enquiry import Enquiry
from app.models.enums import EnquiryStatus
from app.models.user import User
from app.schemas.common import Page, Pagination
from app.schemas.enquiry import EnquiryCreateIn, EnquiryCreateOut, EnquiryOut, EnquiryUpdateIn
from app.services import enquiries as enquiry_service

router = APIRouter(prefix="/api/enquiries", tags=["enquiries"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=EnquiryCreateOut)
def create_enquiry(
    payload: EnquiryCreateIn,
    db: Session = Depends(get_db),
    notifier: EnquiryNotifier = Depends(get_enquiry_notifier),
) -> EnquiryCreateOut:
    enquiry, alert = enquiry_service.create_enquiry(db, payload, notifier)
    return EnquiryCreateOut(enquiry=EnquiryOut.model_validate(enquiry), alert=alert)


@router.get("", response_model=Page[EnquiryOut])
def list_enquiries(
    pagination: Pagination = Depends(),
    status_filter: EnquiryStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[EnquiryOut]:
    query = select(Enquiry)
    if status_filter is not None:
        query = query.where(Enquiry.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Enquiry.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[EnquiryOut.model_validate(e) for e in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{enquiry_id}", response_model=EnquiryOut)
def get_enquiry(
    enquiry_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> EnquiryOut:
    enquiry = enquiry_service.get_enquiry(db, enquiry_id)
    if enquiry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    return EnquiryOut.model_validate(enquiry)


@router.patch("/{enquiry_id}", response_model=EnquiryOut)
def update_enquiry(
    enquiry_id: uuid.UUID,
    payload: EnquiryUpdateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> EnquiryOut:
    enquiry = enquiry_service.get_enquiry(db, enquiry_id)
    if enquiry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found")
    enquiry.status = payload.status
    db.commit()
    db.refresh(enquiry)
    return EnquiryOut.model_validate(enquiry)
