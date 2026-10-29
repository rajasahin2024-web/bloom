"""Applications router — public careers intake + admin hiring pipeline.

`POST /api/applications` is the careers form's backend: it stores the
application at the `applied` stage and fires the WhatsApp alert through the
WAISE adapter (stub until TEC-64 lands a real client).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_admin
from app.integrations.waise import ApplicationNotifier, get_application_notifier
from app.models.application import Application
from app.models.enums import ApplicationStage
from app.models.user import User
from app.schemas.application import (
    ApplicationCreateIn,
    ApplicationCreateOut,
    ApplicationOut,
    ApplicationUpdateIn,
)
from app.schemas.common import Page, Pagination
from app.services import applications as application_service

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApplicationCreateOut)
def create_application(
    payload: ApplicationCreateIn,
    db: Session = Depends(get_db),
    notifier: ApplicationNotifier = Depends(get_application_notifier),
) -> ApplicationCreateOut:
    application, alert = application_service.create_application(db, payload, notifier)
    return ApplicationCreateOut(
        application=ApplicationOut.model_validate(application), alert=alert
    )


@router.get("", response_model=Page[ApplicationOut])
def list_applications(
    pagination: Pagination = Depends(),
    stage_filter: ApplicationStage | None = Query(default=None, alias="stage"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[ApplicationOut]:
    query = select(Application)
    if stage_filter is not None:
        query = query.where(Application.stage == stage_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(
        query.order_by(Application.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).all()
    return Page(
        items=[ApplicationOut.model_validate(a) for a in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{application_id}", response_model=ApplicationOut)
def get_application(
    application_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ApplicationOut:
    application = application_service.get_application(db, application_id)
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    return ApplicationOut.model_validate(application)


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: uuid.UUID,
    payload: ApplicationUpdateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ApplicationOut:
    application = application_service.get_application(db, application_id)
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    application.stage = payload.stage
    db.commit()
    db.refresh(application)
    return ApplicationOut.model_validate(application)
