"""One-shot database bootstrap — ``python -m app.bootstrap``.

The setup wizard's apply step only writes ``.env``; it never touches the
database. This module is the deferred half, run once when the operator wants
the schema and first admin created:

1. ``alembic upgrade head`` — via ``DATABASE_URL_DIRECT`` when set (DDL must
   not go through a PgBouncer transaction pool).
2. First-admin seed — when the wizard collected admin credentials it stored
   them as ``SEED_ADMIN_*`` in the env file; after a successful seed those
   keys are stripped so the password does not linger on disk.

Re-runnable: alembic upgrade is a no-op at head and the seed upserts.
Used by ``platform/scripts/init-db.sh``.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from app.core.config import get_settings
from app.services import setup as setup_service

_SEED_KEYS = ("SEED_ADMIN_EMAIL", "SEED_ADMIN_NAME", "SEED_ADMIN_PASSWORD")


def _env_file_value(path: Path, key: str) -> str | None:
    """Read a single key from a dotenv file (reverses ``_dotenv_value``)."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    pattern = re.compile(rf"^\s*(?:export\s+)?{key}\s*=\s*(.*)$")
    for line in text.splitlines():
        match = pattern.match(line)
        if match:
            value = match.group(1).strip()
            if len(value) >= 2 and value.startswith('"') and value.endswith('"'):
                value = value[1:-1].replace("\\\\", "\\").replace('\\"', '"')
            return value
    return None


def _seed_credentials() -> tuple[str, str, str] | None:
    """SEED_ADMIN_* from os.environ, falling back to the env file."""
    raw = {
        key: os.environ.get(key)
        or _env_file_value(setup_service.ENV_FILE_PATH, key)
        for key in _SEED_KEYS
    }
    email = (raw["SEED_ADMIN_EMAIL"] or "").strip()
    name = (raw["SEED_ADMIN_NAME"] or "").strip()
    password = raw["SEED_ADMIN_PASSWORD"] or ""
    if not (email or name or password):
        return None
    if not (email and password):
        raise SystemExit(
            "Incomplete SEED_ADMIN_* — need at least SEED_ADMIN_EMAIL and "
            "SEED_ADMIN_PASSWORD (set them in .env or the environment)."
        )
    return email, password, name or "Administrator"


def _strip_seed_keys(path: Path) -> None:
    """Drop SEED_ADMIN_* lines from the env file after a successful seed."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    kept: list[str] = []
    removed = False
    for line in lines:
        match = setup_service._ENV_KEY.match(line)
        if match and match.group(1) in _SEED_KEYS:
            removed = True
            continue
        kept.append(line)
    if removed:
        path.write_text("\n".join(kept) + "\n", encoding="utf-8")


def main() -> int:
    get_settings.cache_clear()
    settings = get_settings()
    url = settings.database_url_direct or settings.database_url
    if not url:
        print(
            "DATABASE_URL is not set — run the /setup wizard first.",
            file=sys.stderr,
        )
        return 1
    if settings.database_url_direct is None:
        print(
            "note: DATABASE_URL_DIRECT unset — using DATABASE_URL. DDL through "
            "a PgBouncer transaction pool may fail; set the direct Postgres "
            "endpoint in .env if it does.",
            file=sys.stderr,
        )

    print("Running migrations (alembic upgrade head)…")
    try:
        setup_service._run_migrations()
    except Exception as exc:
        print(f"Migration failed: {exc}", file=sys.stderr)
        print(
            "Hint: migrations need the direct Postgres endpoint — point "
            "DATABASE_URL_DIRECT in .env at Postgres itself, not PgBouncer.",
            file=sys.stderr,
        )
        return 1

    creds = _seed_credentials()
    if creds is None:
        print("No SEED_ADMIN_* credentials — skipping admin seed.")
        return 0
    email, password, name = creds
    try:
        setup_service._seed_admin(email, password, name, url)
    except Exception as exc:
        print(f"Admin seed failed: {exc}", file=sys.stderr)
        return 1
    _strip_seed_keys(setup_service.ENV_FILE_PATH)
    print(f"Admin seeded: {email}")
    print(f"SEED_ADMIN_* removed from {setup_service.ENV_FILE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
