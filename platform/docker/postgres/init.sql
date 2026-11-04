-- Bloom platform — Postgres init
-- Runs once on first DB creation (docker-entrypoint-initdb.d).
-- pgvector image already ships the extension files; we just enable it.

CREATE EXTENSION IF NOT EXISTS vector;

-- Dedicated test database so integration tests NEVER touch the live
-- ``bloom`` database. Tests reset/clear settings rows in finally blocks;
-- running them against ``bloom`` wiped admin-saved R2 credentials (TEC-179).
-- ``bloom_test`` is created here (initdb runs as superuser) and migrated by
-- the CI workflow's migrate step + platform/scripts/test.sh.
CREATE DATABASE bloom_test OWNER bloom;
\c bloom_test
CREATE EXTENSION IF NOT EXISTS vector;
