# Bloom AI Tutor

Parallel development track (see [TEC-62](/TEC/issues/TEC-62)).

The AI Tutor is a separately scalable Python service: FastAPI gateway + Redis
queue + Python worker pool, LangGraph + RAG over pgvector.

Stage 0 intentionally leaves this directory as a placeholder. The M1 service
skeleton is owned by TEC-62 and will be built out here once Stage 0 (TEC-60)
lands the shared infra (Postgres + pgvector, PgBouncer, Redis).

## Shared infra

The AI Tutor reuses the platform's local stack defined in
`../docker-compose.yml`:

- **pgvector** (inside Postgres) — embedding store for the knowledge base
- **Redis** — the job queue feeding the worker pool
- **PgBouncer** — connection pooling in front of Postgres
