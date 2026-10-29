# Bloom — Workspace Conventions

Project: **Bloom Academy IELTS Learning Platform** (Techfly client engagement, proposal v5.1 — ₹2.7L, 3-month delivery).

## Layout — keep the root clean

- `docs/` — all project documents (proposals, architecture, roadmaps, cost annexure) + `docs/tools/` render scripts
- `platform/` — the actual product code (`api`, `web`, `ai-tutor`, `docker`, `scripts`, `docker-compose.yml`)
- `prototype/` — client's original front-end prototype bundle (functional spec). Bloom pages only — the FMA/iMet admin bundle was removed per TEC-78.
- `misc/` — agent scratch space, **gitignored**
- `.gitignore` — covers `misc/`, `.scratch/`, env files, build artifacts

## Rules for any agent working here

1. **Never create loose files in the workspace root.** Temp files, check scripts, scratch output → `misc/` (or the Paperclip run scratch dir). `misc/` is gitignored so nothing temporary enters commits.
2. **Never leave credentials on disk.** Run JWTs/tokens are deleted when a run ends; do not persist them in the repo.
3. Project docs live in `docs/` — read those before proposing scope/architecture changes.
4. Tech stack is fixed (proposal v5.1): React+Vite+TS, FastAPI, Postgres+pgvector+PgBouncer, Redis, LangGraph `ai-tutor`, Docker Compose. Architecture decision A1: modular monolith; carve-outs only `ai-tutor` and mail engine.
5. Boss communicates in Banglish and often wants a direct answer only — in ask-mode issues, answer in the thread; don't implement.
6. **Ported CSS must be committed pre-scoped.** Any CSS block ported from `prototype/` must be scoped under its own shell root (e.g., `.site-root .app`), never bare `.site-root` — bare ported selectors leak onto site elements sharing the class name (regression class: TEC-139, TEC-142).
   - Review-time gate before merging stylesheet changes: `npx vitest run src/styles/css-scope.test.ts` in `platform/web` must pass — it fails on any new bare `.site-root <app-shell-class>` selector that could match markup outside its intended shell. Also check for class-name collisions with existing site components.

## Deploy / preview ports (host: 82.112.226.111)

- `ufw allow <port>/tcp` is enough — no cloud firewall panel.
- **Port 8080 is taken** by an unrelated live service (`news-portal-linux`, `/www/wwwroot/teestatorsha`) — do not kill it. For the funnel web preview use **8081** (or next free port) and note the actual port in your issue comment/work product.
- Funnel API target port **8090** is free as of 2026-09-24.
