"""Database engine and session management.

The app connects to PostgreSQL through PgBouncer (transaction pooling), so:
  - server-side prepared statements are disabled (psycopg prepare_threshold=None)
  - connection recycling + pre-ping keep stale pooled connections from breaking
  - the engine pool is small; PgBouncer does the real pooling in front of Postgres

Migrations use `database_url_direct` (raw Postgres, session mode) when set.

Engines are built lazily: when the app boots unconfigured (no DATABASE_URL,
i.e. before first-run setup), `get_db` returns 503 instead of crashing. After
the setup wizard writes `.env` and clears the settings cache, the next request
builds the engine — no restart required.
"""

from __future__ import annotations

import threading
from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_engine: Engine | None = None
_direct_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None
_init_lock = threading.Lock()


def _build_engine(url: str) -> Engine:
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=1800,
        # PgBouncer transaction mode: keep the SQLAlchemy-side pool small and
        # disable server-side prepared statements.
        pool_size=5,
        max_overflow=5,
        future=True,
        connect_args={"prepare_threshold": None},
    )


def _init_engines() -> None:
    """Build engines from current settings if missing. Idempotent + thread-safe."""
    global _engine, _direct_engine, _session_factory
    settings = get_settings()
    with _init_lock:
        if _engine is None and settings.database_url:
            _engine = _build_engine(settings.database_url)
            _session_factory = sessionmaker(
                bind=_engine, autoflush=False, autocommit=False, future=True
            )
        if _direct_engine is None and settings.database_url_direct:
            _direct_engine = _build_engine(settings.database_url_direct)


_init_engines()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a session bound to the PgBouncer engine."""
    if _session_factory is None:
        _init_engines()
    if _session_factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured — complete the first-run setup wizard",
        )
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()


def get_migration_engine() -> Engine:
    """Engine for Alembic migrations — prefers the direct Postgres URL."""
    _init_engines()
    if _direct_engine is not None:
        return _direct_engine
    if _engine is not None:
        return _engine
    raise RuntimeError("Database is not configured — run the setup wizard first")
