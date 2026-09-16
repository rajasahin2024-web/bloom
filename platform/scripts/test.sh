#!/usr/bin/env bash
# Run tests for the whole monorepo: API (pytest) + Web (vitest).
# Usage: ./scripts/test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rc=0

echo "→ Testing API (pytest)…"
if command -v pytest >/dev/null 2>&1; then
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
