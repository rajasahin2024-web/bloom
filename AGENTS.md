# Bloom — Workspace Conventions

Project: **Bloom Academy IELTS Learning Platform** (Techfly client engagement, proposal v5.1 — ₹2.7L, 3-month delivery).

## Layout — keep the root clean

- `docs/` — all project documents (proposals, architecture, roadmaps, cost annexure) + `docs/tools/` render scripts
- `platform/` — the actual product code (`api`, `web`, `ai-tutor`, `docker`, `scripts`, `docker-compose.yml`)
- `prototype/` — client's original FMAHTML front-end prototype bundle (functional spec)
- `misc/` — agent scratch space, **gitignored**
- `.gitignore` — covers `misc/`, `.scratch/`, env files, build artifacts

## Rules for any agent working here

1. **Never create loose files in the workspace root.** Temp files, check scripts, scratch output → `misc/` (or the Paperclip run scratch dir). `misc/` is gitignored so nothing temporary enters commits.
2. **Never leave credentials on disk.** Run JWTs/tokens are deleted when a run ends; do not persist them in the repo.
3. Project docs live in `docs/` — read those before proposing scope/architecture changes.
4. Tech stack is fixed (proposal v5.1): React+Vite+TS, FastAPI, Postgres+pgvector+PgBouncer, Redis, LangGraph `ai-tutor`, Docker Compose. Architecture decision A1: modular monolith; carve-outs only `ai-tutor` and mail engine.
5. Boss communicates in Banglish and often wants a direct answer only — in ask-mode issues, answer in the thread; don't implement.
