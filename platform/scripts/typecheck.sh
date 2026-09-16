#!/usr/bin/env bash
# Typecheck the whole monorepo: API (mypy) + Web (tsc).
# Usage: ./scripts/typecheck.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rc=0

echo "→ Typechecking API (mypy)…"
if command -v mypy >/dev/null 2>&1; then
  (cd "$ROOT/api" && mypy app) || rc=1
else
  echo "  mypy not installed; skipping API typecheck"
fi

echo "→ Typechecking Web (tsc)…"
if [ -d "$ROOT/web/node_modules" ]; then
  (cd "$ROOT/web" && pnpm typecheck) || rc=1
else
  echo "  web deps not installed; run 'pnpm install' in web/ first"
  rc=1
fi

exit "$rc"
