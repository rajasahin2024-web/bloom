# Bloom Platform

Bloom Academy IELTS platform monorepo.

- `web/` — React + Vite + TypeScript frontend (all panels + public site)
- `api/` — FastAPI (Python) backend
- `ai-tutor/` — parallel track: FastAPI gateway + Redis queue + LangGraph worker pool (TEC-62)
- `docker-compose.yml` — local infra: PostgreSQL 16 (pgvector) + PgBouncer + Redis
- `scripts/` — lint / typecheck / test entrypoints shared by every stage

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite + TypeScript |
| Backend | FastAPI (Python) |
| Database | PostgreSQL 16 |
| DB pooling | PgBouncer (transaction mode) |
| Vector search | pgvector (inside Postgres) |
| Cache / queue | Redis |

## Prerequisites

- Docker + Docker Compose v2 (`docker compose`)
- Node 20+ and pnpm 9+ (for local web dev outside Docker)
- Python 3.11+ (for local API dev outside Docker)

## Quick start (< 10 minutes)

### 1. Configure environment

```bash
cd platform
cp .env.example .env
# Review .env — defaults are fine for local dev.
```

### 2. Start the infrastructure

```bash
docker compose up -d postgres pgbouncer redis
```

Wait for health:

```bash
docker compose ps
# All three should show (healthy)
```

### 3. Start the API

**Option A — in Docker (full stack):**

```bash
docker compose up -d --build api
```

**Option B — locally (faster iteration, hot reload):**

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","service":"bloom-api", ... "checks":{"postgres":{"ok":true,"via":"pgbouncer","pgvector":true}, ...}}
```

### 4. Start the web dev server

```bash
cd web
pnpm install
pnpm dev
# → http://localhost:5173
```

The home page renders the base layout and shows the live API health check.

### 5. Run the whole stack in Docker

```bash
docker compose up -d --build
docker compose ps          # all services healthy
```

## Database migrations (Alembic)

All migrations live in one place: `api/alembic/versions`. They connect
**directly** to Postgres (`DATABASE_URL_DIRECT`), bypassing PgBouncer, so DDL
is safe under session mode.

The `/setup` wizard's apply step only writes `.env` — it never touches the
database. To initialize the schema (and seed the first admin when the wizard
collected credentials as `SEED_ADMIN_*`), run once:

```bash
./scripts/init-db.sh
```

Manual control when needed:

```bash
cd api
source .venv/bin/activate

# Create a revision
alembic revision --autogenerate -m "describe change"

# Apply
alembic upgrade head

# Rollback one
alembic downgrade -1

# Seed/reseed the first admin without a wizard-provided SEED_ADMIN_*
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=… \
  SEED_ADMIN_NAME="Admin" python -m app.bootstrap
```

## Lint / typecheck / test

From `platform/`:

```bash
./scripts/lint.sh        # ruff (api) + eslint (web)
./scripts/typecheck.sh   # mypy (api) + tsc (web)
./scripts/test.sh        # pytest (api) + vitest (web)
```

Per-app shortcuts:

```bash
# API
cd api && ruff check app && mypy app && pytest

# Web
cd web && pnpm lint && pnpm typecheck && pnpm test
```

## Connection topology

```
Web (Vite :5173) ──HTTP──▶ API (FastAPI :8000) ──▶ PgBouncer (:6432) ──▶ Postgres (:5432, pgvector)
                                  │
                                  └──▶ Redis (:6379)

Alembic migrations ──▶ Postgres (:5432) directly   [session mode, safe for DDL]
```

- App runtime uses `DATABASE_URL` → PgBouncer (transaction pooling).
- Migrations use `DATABASE_URL_DIRECT` → Postgres directly.

### Host port mappings

Inside the Docker network, services use their canonical ports. The host ports
are remapped because some are already in use on this machine:

| Service | Container port | Host port |
| --- | --- | --- |
| Postgres | 5432 | **5433** |
| PgBouncer | 6432 | 6432 |
| Redis | 6379 | **6380** |
| API | 8000 | 8000 |
| Web | 5173 | 5173 |

For local dev (running `uvicorn` / `vite` on the host), `.env.example` already
points at these host ports. When the API runs inside Docker, `docker-compose.yml`
overrides the URLs with the docker-internal hostnames.

## Health contract

`GET /api/health` returns `200` with a JSON body:

```json
{
  "status": "ok",
  "service": "bloom-api",
  "env": "development",
  "checks": {
    "postgres": { "ok": true, "via": "pgbouncer", "pgvector": true },
    "redis": { "ok": true }
  }
}
```

`status` is `"ok"` when both Postgres (via PgBouncer) and Redis are reachable,
otherwise `"degraded"`. The Docker healthcheck and any future load balancer
treat `200` + `status: ok` as healthy.

## Tear down

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop + delete data volumes
```

## Project layout

```
platform/
├── docker-compose.yml
├── .env.example
├── README.md
├── scripts/            # lint.sh, typecheck.sh, test.sh
├── docker/             # infra config (postgres init, pgbouncer)
├── web/                # React + Vite + TS
│   ├── src/
│   │   ├── config/env.ts
│   │   ├── layouts/BaseLayout.tsx
│   │   ├── routes/HomePage.tsx
│   │   ├── router.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── api/                # FastAPI
│   ├── app/
│   │   ├── core/       # config, database (PgBouncer), redis
│   │   ├── routers/    # health router
│   │   ├── models/     # ORM models (Base)
│   │   ├── services/   # business logic
│   │   └── tests/
│   ├── alembic/        # migrations
│   ├── Dockerfile
│   └── pyproject.toml
└── ai-tutor/           # parallel track (TEC-62)
```
