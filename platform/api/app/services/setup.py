"""First-run setup wizard service.

Implements the real work behind `/api/setup/*`: connectivity checks against
the candidate Postgres/PgBouncer and Redis endpoints, atomic `.env` writes,
alembic migrations, and first-admin seeding.

The `configured` flag is the commit marker: it is only flipped (in `.env` and
in-process) after every apply stage has succeeded, so a failed apply leaves
the wizard retryable.
"""

from __future__ import annotations

import logging
import os
import re
import secrets
import socket
import tempfile
import threading
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import psycopg
from alembic.config import Config as AlembicConfig
from redis import Redis
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from alembic import command as alembic_command
from app.core.config import PLATFORM_ENV_FILE, get_settings
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.setup import (
    DatabaseTestIn,
    DatabaseTestOut,
    RedisTestIn,
    RedisTestOut,
    SetupApplyIn,
    SetupApplyOut,
    SetupCheck,
)

logger = logging.getLogger(__name__)

# Env file the wizard writes / reads for the configured flag. Module-level so
# tests can point it at a scratch file.
ENV_FILE_PATH = PLATFORM_ENV_FILE

_TCP_TIMEOUT_SECONDS = 4
_PG_CONNECT_TIMEOUT_SECONDS = 5
_REDIS_TIMEOUT_SECONDS = 4

_applied = False
_apply_lock = threading.Lock()

_PGBOUNCER_TXN_CAVEAT = (
    "PgBouncer transaction pooling is in use: server-side prepared statements "
    "must stay disabled (the app does this via prepare_threshold=None) and "
    "session-level features (SET, LISTEN/NOTIFY, advisory locks) are "
    "unavailable to app connections."
)


# ── configured state ─────────────────────────────────────────────────────


def _env_file_configured() -> bool:
    """Read SETUP_COMPLETE from the env file (source of truth across restarts)."""
    try:
        text = ENV_FILE_PATH.read_text(encoding="utf-8")
    except OSError:
        return False
    for line in text.splitlines():
        match = re.match(r"^\s*SETUP_COMPLETE\s*=\s*(.*)$", line)
        if match:
            value = match.group(1).strip().strip('"').strip("'").lower()
            return value in {"1", "true", "yes", "on"}
    return False


def is_configured() -> bool:
    """Per-request check used to self-lock all /api/setup/* endpoints."""
    return _applied or get_settings().setup_complete or _env_file_configured()


# ── database connectivity test ───────────────────────────────────────────


def _tcp_check(host: str, port: int) -> SetupCheck:
    try:
        with socket.create_connection((host, port), timeout=_TCP_TIMEOUT_SECONDS):
            return SetupCheck(name="tcp", ok=True, detail=f"{host}:{port} is reachable")
    except OSError as exc:
        return SetupCheck(
            name="tcp",
            ok=False,
            detail=f"Cannot reach {host}:{port} — {exc.strerror or exc}",
        )


def _pg_connect(target: DatabaseTestIn, dbname: str) -> psycopg.Connection[Any]:
    return psycopg.connect(
        host=target.host,
        port=target.port,
        dbname=dbname,
        user=target.username,
        password=target.password,
        connect_timeout=_PG_CONNECT_TIMEOUT_SECONDS,
        sslmode="require" if target.ssl else "disable",
        prepare_threshold=None,
        # autocommit: the PgBouncer admin console rejects BEGIN; plain
        # verification SELECTs don't need a transaction anyway.
        autocommit=True,
    )


# psycopg raises OperationalError with sqlstate=None for connect-time
# failures — the server's FATAL sqlstate is not propagated — so the equivalent
# class is recovered from the libpq message text.
_MESSAGE_SQLSTATES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"password authentication failed"), "28P01"),
    (re.compile(r"database\b.*\bdoes not exist"), "3D000"),
    (re.compile(r"no pg_hba\.conf entry|is not permitted to log in"), "28000"),
)


def _classify_connect_error(exc: psycopg.Error, database: str) -> tuple[str, str]:
    """Map a connect failure to (plain-language error, actionable hint)."""
    sqlstate = getattr(exc, "sqlstate", "") or ""
    text = str(exc)
    low = text.lower()
    if not sqlstate:
        sqlstate = next(
            (code for pattern, code in _MESSAGE_SQLSTATES if pattern.search(low)),
            "",
        )
    if sqlstate == "28P01":
        return (
            "Authentication failed — the username or password was rejected.",
            "Double-check the database username and password.",
        )
    if sqlstate == "3D000":
        return (
            f'Database "{database}" does not exist on this server.',
            "Create the database first, or fix the database name.",
        )
    if sqlstate in {"28000", "42501"}:
        return (
            "The server rejected the connection (pg_hba.conf / role not permitted).",
            "Check pg_hba.conf on the server and that this role may log in.",
        )
    if "timeout" in low or "timed out" in low:
        return (
            "The connection timed out.",
            "Check firewall/security-group rules and that the host and port are correct.",
        )
    if "ssl" in low:
        return (
            "SSL negotiation failed.",
            "Toggle the SSL option — the server may require SSL, or may not support it.",
        )
    first_line = text.splitlines()[0] if text else "Connection failed."
    # Drop libpq's "connection failed: connection to server at ... failed:"
    # wrapper so the server's own message (e.g. the FATAL line) shows.
    first_line = re.sub(r"^connection failed:\s*", "", first_line)
    first_line = re.sub(r"^connection to server .*?failed:\s*", "", first_line)
    return first_line, "Check the connection details and try again."


def _probe_pgbouncer(target: DatabaseTestIn) -> tuple[bool, str]:
    """Detect PgBouncer via its admin console (`SHOW VERSION` on db `pgbouncer`)."""
    try:
        conn = _pg_connect(target, "pgbouncer")
        try:
            row = conn.execute("SHOW VERSION").fetchone()
        finally:
            conn.close()
    except psycopg.Error as exc:
        detail = str(exc).splitlines()[0] if str(exc) else "admin console unreachable"
        return False, f"admin console probe failed — {detail}"
    version = str(row[0]) if row else ""
    if "pgbouncer" in version.lower():
        return True, version
    return False, f"unexpected admin console response: {version or 'empty'}"


def test_database(target: DatabaseTestIn) -> DatabaseTestOut:
    checks: list[SetupCheck] = []

    tcp = _tcp_check(target.host, target.port)
    checks.append(tcp)
    if not tcp.ok:
        return DatabaseTestOut(
            ok=False,
            checks=checks,
            error=tcp.detail,
            hint=(
                "Check the host and port, and that PostgreSQL (or PgBouncer) is "
                "running and reachable from this machine."
            ),
        )

    try:
        conn = _pg_connect(target, target.database)
    except psycopg.Error as exc:
        error, hint = _classify_connect_error(exc, target.database)
        checks.append(SetupCheck(name="auth", ok=False, detail=error))
        return DatabaseTestOut(ok=False, checks=checks, error=error, hint=hint)

    postgres_version: str | None = None
    pgvector_installed = False
    try:
        row = conn.execute("SELECT version()").fetchone()
        postgres_version = str(row[0]) if row else None
        checks.append(
            SetupCheck(
                name="auth", ok=True, detail="Authenticated and ran SELECT version()"
            )
        )
        row = conn.execute(
            "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
        ).fetchone()
        pgvector_installed = bool(row[0]) if row else False
        checks.append(
            SetupCheck(
                name="pgvector",
                ok=pgvector_installed,
                detail=(
                    "pgvector extension is installed"
                    if pgvector_installed
                    else "pgvector extension is NOT installed in this database"
                ),
            )
        )
    except psycopg.Error as exc:
        checks.append(
            SetupCheck(name="auth", ok=False, detail=str(exc).splitlines()[0])
        )
        return DatabaseTestOut(
            ok=False,
            checks=checks,
            error="Connected, but the verification query failed.",
            hint="Check that the database user can run queries on this database.",
        )
    finally:
        conn.close()

    detected, detect_detail = _probe_pgbouncer(target)
    if target.connection_type == "pgbouncer":
        checks.append(
            SetupCheck(
                name="pgbouncer",
                ok=detected,
                detail=(
                    f"Detected {detect_detail}"
                    if detected
                    else f"Could not confirm PgBouncer — {detect_detail}"
                ),
            )
        )
    elif detected:
        checks.append(
            SetupCheck(
                name="pgbouncer",
                ok=True,
                detail=f"This endpoint is actually PgBouncer ({detect_detail})",
            )
        )

    if not pgvector_installed:
        return DatabaseTestOut(
            ok=False,
            checks=checks,
            postgres_version=postgres_version,
            pgvector_installed=False,
            pgbouncer_detected=detected,
            error="The pgvector extension is not installed in this database.",
            hint=(
                "Install it with CREATE EXTENSION vector; (requires the pgvector "
                "package — the pgvector/pgvector Docker image ships it), then "
                "re-run this test."
            ),
        )

    success_hint: str | None = None
    if target.connection_type == "pgbouncer":
        success_hint = _PGBOUNCER_TXN_CAVEAT
        if not detected:
            success_hint += (
                " The endpoint works, but the pooler could not be confirmed — "
                "verify it really is PgBouncer."
            )
    elif detected:
        success_hint = (
            "This endpoint answers to the PgBouncer admin console — it looks like "
            "a pooler, not a direct Postgres connection. Use connection_type "
            '"pgbouncer" for the app URL and supply a direct Postgres endpoint '
            "for migrations."
        )

    return DatabaseTestOut(
        ok=True,
        checks=checks,
        postgres_version=postgres_version,
        pgvector_installed=pgvector_installed,
        pgbouncer_detected=detected,
        error=None,
        hint=success_hint,
    )


# ── redis connectivity test ──────────────────────────────────────────────


def test_redis(target: RedisTestIn) -> RedisTestOut:
    try:
        client = Redis(
            host=target.host,
            port=target.port,
            password=target.password,
            socket_connect_timeout=_REDIS_TIMEOUT_SECONDS,
            socket_timeout=_REDIS_TIMEOUT_SECONDS,
        )
        pong = client.ping()
    except Exception as exc:  # noqa: BLE001 - surface any client failure plainly
        message = str(exc).splitlines()[0] or "Redis connection failed"
        return RedisTestOut(
            ok=False,
            error=f"Cannot reach Redis at {target.host}:{target.port} — {message}",
        )
    if not pong:
        return RedisTestOut(ok=False, error="Redis did not answer PING")
    return RedisTestOut(ok=True, error=None)


# ── apply ────────────────────────────────────────────────────────────────


def _sqlalchemy_url(target: DatabaseTestIn) -> str:
    user = quote_plus(target.username)
    password = quote_plus(target.password)
    url = (
        f"postgresql+psycopg://{user}:{password}"
        f"@{target.host}:{target.port}/{target.database}"
    )
    if target.ssl:
        url += "?sslmode=require"
    return url


def _redis_url(target: RedisTestIn) -> str:
    auth = f":{quote_plus(target.password)}@" if target.password else ""
    return f"redis://{auth}{target.host}:{target.port}/0"


_ENV_KEY = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")
_SAFE_VALUE = re.compile(r"^[A-Za-z0-9_./:@%+=,~\-]*$")


def _dotenv_value(value: str) -> str:
    if _SAFE_VALUE.match(value):
        return value
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _write_env_file(updates: dict[str, str]) -> None:
    """Merge `updates` into the env file atomically (temp file + rename, 0600)."""
    path = ENV_FILE_PATH
    existing = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    out: list[str] = []
    written: set[str] = set()
    for line in existing:
        match = _ENV_KEY.match(line)
        if match and match.group(1) in updates:
            key = match.group(1)
            if key not in written:
                out.append(f"{key}={_dotenv_value(updates[key])}")
                written.add(key)
            # extra duplicate lines for an updated key are dropped
        else:
            out.append(line)
    missing = [k for k in updates if k not in written]
    if missing:
        if out and out[-1].strip():
            out.append("")
        out.append("# Written by first-run setup wizard")
        for key in missing:
            out.append(f"{key}={_dotenv_value(updates[key])}")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".env.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write("\n".join(out) + "\n")
        os.chmod(tmp_name, 0o600)
        os.replace(tmp_name, path)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise


def _run_migrations() -> None:
    api_dir = Path(__file__).resolve().parents[2]  # platform/api
    config = AlembicConfig(str(api_dir / "alembic.ini"))
    config.set_main_option("script_location", str(api_dir / "alembic"))
    alembic_command.upgrade(config, "head")


def _seed_admin(email: str, password: str, full_name: str, url: str) -> None:
    engine = create_engine(
        url, poolclass=NullPool, connect_args={"prepare_threshold": None}
    )
    try:
        with Session(engine) as db:
            user = db.scalar(select(User).where(User.email == email))
            password_hash = hash_password(password)
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    password_hash=password_hash,
                    role=UserRole.admin,
                    is_active=True,
                )
                db.add(user)
            else:
                user.full_name = full_name
                user.password_hash = password_hash
                user.role = UserRole.admin
                user.is_active = True
            db.commit()
    finally:
        engine.dispose()


class _ApplyStageError(Exception):
    """Wraps a stage failure with a plain-language prefix."""


def _restore_environ(saved: dict[str, str | None]) -> None:
    for key, value in saved.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    get_settings.cache_clear()


def apply_setup(payload: SetupApplyIn) -> SetupApplyOut:
    """Re-test, write `.env`, migrate, and seed the first admin.

    Failure-safe: `.env` is the last thing written, so a failure at any stage
    leaves the wizard unconfigured and retryable.
    """
    with _apply_lock:
        if is_configured():
            return SetupApplyOut(
                ok=False, configured=True, error="Setup has already been completed"
            )

        test = test_database(payload.database)
        if not test.ok:
            return SetupApplyOut(
                ok=False,
                configured=False,
                error=test.error or "Database checks failed",
            )

        if payload.redis is not None:
            redis_test = test_redis(payload.redis)
            if not redis_test.ok:
                return SetupApplyOut(
                    ok=False,
                    configured=False,
                    error=f"Redis check failed: {redis_test.error}",
                )

        database_url = _sqlalchemy_url(payload.database)
        # Only one endpoint is collected; it is used for both app and
        # migrations. For "pgbouncer" installs the direct URL should be
        # adjusted to the raw Postgres endpoint in `.env` afterwards.
        updates = {
            "DATABASE_URL": database_url,
            "DATABASE_URL_DIRECT": database_url,
            "JWT_SECRET": secrets.token_hex(32),
            "SETUP_COMPLETE": "true",
        }
        if payload.redis is not None:
            updates["REDIS_URL"] = _redis_url(payload.redis)

        # Stage env vars so alembic env.py / settings resolve the new URLs
        # before the file lands on disk.
        saved = {key: os.environ.get(key) for key in updates}
        try:
            os.environ.update(updates)
            get_settings.cache_clear()
            try:
                _run_migrations()
            except Exception as exc:
                raise _ApplyStageError(f"Database migrations failed: {exc}") from exc
            try:
                _seed_admin(
                    str(payload.admin_email),
                    payload.admin_password,
                    payload.admin_name,
                    database_url,
                )
            except Exception as exc:
                raise _ApplyStageError(f"Admin user seeding failed: {exc}") from exc
            try:
                _write_env_file(updates)
            except Exception as exc:
                raise _ApplyStageError(f"Writing {ENV_FILE_PATH} failed: {exc}") from exc
        except _ApplyStageError as exc:
            _restore_environ(saved)
            logger.warning("setup apply failed: %s", exc)
            return SetupApplyOut(ok=False, configured=False, error=str(exc))

        global _applied
        _applied = True
        logger.info("first-run setup completed; .env written to %s", ENV_FILE_PATH)
        return SetupApplyOut(ok=True, configured=True, error=None)
