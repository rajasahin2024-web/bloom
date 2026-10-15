"""Health route — Postgres (via PgBouncer) + pgvector + Redis + queue depth."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from tutor.core.config import get_settings
from tutor.core.database import get_db
from tutor.core.redis import get_redis

router = APIRouter(tags=["health"])

_settings = get_settings()


@router.get("/health", status_code=status.HTTP_200_OK)
def health(db: Session = Depends(get_db)) -> dict[str, Any]:
    db_ok = False
    db_error: str | None = None
    pgvector_ok = False
    kb_ready = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
        pgvector_ok = (
            db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")).scalar()
            == 1
        )
        insp = inspect(db.get_bind())
        kb_ready = insp.has_table("kb_chunks", schema="tutor")
    except Exception as exc:  # noqa: BLE001 - health check must never raise
        db_error = str(exc)

    redis_ok = False
    redis_error: str | None = None
    queue_depth: int | None = None
    try:
        r = get_redis()
        redis_ok = bool(r.ping())
        queue_depth = int(r.llen(_settings.chat_queue_key))
    except Exception as exc:  # noqa: BLE001
        redis_error = str(exc)

    return {
        "status": "ok" if (db_ok and redis_ok) else "degraded",
        "service": "bloom-ai-tutor",
        "env": _settings.tutor_env,
        "checks": {
            "postgres": {
                "ok": db_ok,
                "via": "pgbouncer",
                "pgvector": pgvector_ok,
                "kb_schema": kb_ready,
                **({"error": db_error} if db_error else {}),
            },
            "redis": {
                "ok": redis_ok,
                "queue_depth": queue_depth,
                **({"error": redis_error} if redis_error else {}),
            },
        },
    }
