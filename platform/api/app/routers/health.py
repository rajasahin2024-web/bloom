"""Health router.

`GET /api/health` verifies the API, the PgBouncer-backed Postgres connection,
and Redis reachability. This is the contract the load balancer and docker
healthcheck rely on.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis

router = APIRouter(prefix="/api", tags=["health"])

_settings = get_settings()


def _check_pgvector(db: Session) -> bool:
    """Return True if the pgvector extension is installed in the database."""
    try:
        result = db.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
        )
        return result.scalar() == 1
    except Exception:  # noqa: BLE001 - health check must never raise
        return False


@router.get("/health", status_code=status.HTTP_200_OK)
def health(db: Session = Depends(get_db)) -> dict[str, Any]:
    # Postgres through PgBouncer
    db_ok = False
    db_error: str | None = None
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        db_error = str(exc)

    pgvector_ok = _check_pgvector(db) if db_ok else False

    # Redis
    redis_ok = False
    redis_error: str | None = None
    try:
        redis_ok = bool(get_redis().ping())
    except Exception as exc:  # noqa: BLE001
        redis_error = str(exc)

    return {
        "status": "ok" if (db_ok and redis_ok) else "degraded",
        "service": "bloom-api",
        "env": _settings.api_env,
        "checks": {
            "postgres": {
                "ok": db_ok,
                "via": "pgbouncer",
                "pgvector": pgvector_ok,
                **({"error": db_error} if db_error else {}),
            },
            "redis": {
                "ok": redis_ok,
                **({"error": redis_error} if redis_error else {}),
            },
        },
    }
