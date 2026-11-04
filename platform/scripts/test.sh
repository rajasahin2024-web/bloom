#!/usr/bin/env bash
# Run tests for the whole monorepo: API (pytest) + Web (vitest).
# Usage: ./scripts/test.sh
#
# API integration tests run against a dedicated ``bloom_test`` database —
# NEVER the live ``bloom`` database. Tests reset/clear settings rows in
# finally blocks; running them against ``bloom`` wiped admin-saved R2
# credentials (TEC-179). This script ensures ``bloom_test`` exists and is
# migrated before pytest runs. If the local docker stack is not up, the
# integration tests skip themselves (``_infra_up`` probes ``bloom_test``).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rc=0

echo "→ Testing API (pytest)…"
if command -v pytest >/dev/null 2>&1; then
  # Ensure the dedicated test DB exists + is migrated. Best-effort: if the
  # docker stack is not up, the integration tests skip themselves.
  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^bloom-postgres-1$'; then
    echo "  ensuring bloom_test database exists and is migrated…"
    docker exec bloom-postgres-1 psql -U bloom -d postgres -tc \
      "SELECT 1 FROM pg_database WHERE datname='bloom_test'" | grep -q 1 \
      || docker exec bloom-postgres-1 psql -U bloom -d postgres -c \
        "CREATE DATABASE bloom_test OWNER bloom"
    docker exec bloom-postgres-1 psql -U bloom -d bloom_test -c \
      "CREATE EXTENSION IF NOT EXISTS vector" >/dev/null
    ( cd "$ROOT/api" && \
      DATABASE_URL_DIRECT="postgresql+psycopg://bloom:bloom_dev_password@localhost:5433/bloom_test" \
      alembic upgrade head ) || true
  fi
  (cd "$ROOT/api" && pytest) || rc=1
else
  echo "  pytest not installed; skipping API tests"
fi

echo "→ Testing Web (vitest)…"
if [ -d "$ROOT/web/node_modules" ]; then
  (cd "$ROOT/web" && pnpm test) || rc=1
else
  echo "  web deps not installed; run 'pnpm install' in web/ first"
  rc=1
fi

exit "$rc"
