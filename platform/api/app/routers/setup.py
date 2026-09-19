"""Setup wizard router — first-run installer backend.

Serves the `/setup` frontend's fixed contract. All endpoints self-lock with
410 Gone once setup has completed (`SETUP_COMPLETE=true`), enforced
per-request via the router-level dependency — not just at mount time.

After a successful apply the app picks up the new `.env` lazily (engines and
the Redis client are built on first use), so no restart is required.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.setup import (
    DatabaseTestIn,
    DatabaseTestOut,
    RedisTestIn,
    RedisTestOut,
    SetupApplyIn,
    SetupApplyOut,
    SetupStatusOut,
)
from app.services import setup as setup_service


def _ensure_not_configured() -> None:
    if setup_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Setup has already been completed",
        )


router = APIRouter(
    prefix="/api/setup",
    tags=["setup"],
    dependencies=[Depends(_ensure_not_configured)],
)


@router.get("/status", response_model=SetupStatusOut)
def status_endpoint() -> SetupStatusOut:
    return SetupStatusOut(configured=setup_service.is_configured())


@router.post("/test-database", response_model=DatabaseTestOut)
def test_database(payload: DatabaseTestIn) -> DatabaseTestOut:
    return setup_service.test_database(payload)


@router.post("/test-redis", response_model=RedisTestOut)
def test_redis(payload: RedisTestIn) -> RedisTestOut:
    return setup_service.test_redis(payload)


@router.post("/apply", response_model=SetupApplyOut)
def apply(payload: SetupApplyIn) -> SetupApplyOut:
    return setup_service.apply_setup(payload)
