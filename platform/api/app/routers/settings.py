"""Admin settings router — the General Settings page backend.

`GET` returns the full grouped registry (every known key with its effective
value, type, options and `source`); `PATCH` bulk-updates `{"key": value}`
with per-key validation. Both are admin-only. GET responses are cached in
Redis (short TTL) and invalidated on every write.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from redis import Redis
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import get_redis
from app.deps import require_admin
from app.models.user import User
from app.schemas.settings import SettingsOut
from app.services import settings as settings_service
from app.services.settings import SettingValidationError

router = APIRouter(prefix="/api/admin/settings", tags=["settings"])


def _optional_redis() -> Redis | None:
    """Settings stay readable when Redis is down — the cache is best-effort."""
    try:
        return get_redis()
    except Exception:  # noqa: BLE001
        return None


@router.get("", response_model=SettingsOut)
def get_all_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict[str, Any]:
    redis = _optional_redis()
    cached = settings_service.get_cached(redis)
    if cached is not None:
        return cached
    payload = settings_service.collect(db)
    settings_service.set_cached(redis, payload)
    return payload


@router.patch("", response_model=SettingsOut)
def update_settings(
    changes: Annotated[dict[str, Any], Body()],
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict[str, Any]:
    if not changes:
        return settings_service.collect(db)
    try:
        payload = settings_service.update(db, changes, user)
    except SettingValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"errors": exc.errors},
        ) from exc
    settings_service.invalidate(_optional_redis())
    return payload


@router.post("/reset", response_model=SettingsOut)
def reset_settings(
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> dict[str, Any]:
    payload = settings_service.reset(db, user)
    settings_service.invalidate(_optional_redis())
    return payload
