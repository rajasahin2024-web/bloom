#!/usr/bin/env bash
# Lint the whole monorepo: API (ruff) + Web (eslint).
# Usage: ./scripts/lint.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
rc=0

echo "→ Linting API (ruff)…"
if command -v ruff >/dev/null 2>&1; then
  (cd "$ROOT/api" && ruff check app) || rc=1
else
  echo "  ruff not installed; skipping API lint"
fi

echo "→ Linting Web (eslint)…"
if [ -d "$ROOT/web/node_modules" ]; then
  (cd "$ROOT/web" && pnpm lint) || rc=1
else
  echo "  web deps not installed; run 'pnpm install' in web/ first"
  rc=1
fi

exit "$rc"
