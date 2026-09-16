-- Bloom platform — Postgres init
-- Runs once on first DB creation (docker-entrypoint-initdb.d).
-- pgvector image already ships the extension files; we just enable it.

CREATE EXTENSION IF NOT EXISTS vector;
