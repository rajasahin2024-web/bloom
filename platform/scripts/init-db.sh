#!/usr/bin/env bash
# One-shot database bootstrap — run AFTER the /setup wizard has written .env.
#
#   ./scripts/init-db.sh
#
# 1. alembic upgrade head  — uses DATABASE_URL_DIRECT when set (direct
#    Postgres endpoint; never run DDL through the PgBouncer transaction pool).
# 2. First-admin seed      — if the wizard collected admin credentials they
#    are in .env as SEED_ADMIN_*; they are consumed here and then removed.
#    To (re)seed manually instead: SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=…
#    SEED_ADMIN_NAME=… ./scripts/init-db.sh
#
# Docker stack: run the same bootstrap inside the api container instead —
# the wizard's .env (BLOOM_ENV_FILE, /app/config/.env) is read there:
#
#   ./scripts/init-db.sh --docker
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "${1:-}" = "--docker" ]; then
  cd "$ROOT"
  exec docker compose exec api python -m app.bootstrap
fi

ENV_FILE="${BLOOM_ENV_FILE:-$ROOT/.env}"

cd "$ROOT/api"
if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

exec python -m app.bootstrap
