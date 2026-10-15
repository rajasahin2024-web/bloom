"""Database engine and session management.

The service connects to PostgreSQL through PgBouncer (transaction pooling), so:
  - server-side prepared statements are disabled (psycopg prepare_threshold=None)
  - connection recycling + pre-ping keep stale pooled connections from breaking
  - the engine pool is small; PgBouncer does the real pooling in front of Postgres

Migrations use `database_url_direct` (raw Postgres, session mode) when set.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from tutor.core.config import get_settings

_settings = get_settings()


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


# Runtime engine — through PgBouncer.
engine: Engine = _build_engine(_settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# Direct engine for migrations / admin (raw Postgres, session mode).
direct_engine: Engine | None = None
if _settings.database_url_direct:
    direct_engine = _build_engine(_settings.database_url_direct)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a session bound to the PgBouncer engine."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_migration_engine() -> Engine:
    """Engine for Alembic migrations — prefers the direct Postgres URL."""
    return direct_engine if direct_engine is not None else engine
