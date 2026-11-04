"""Pytest configuration — hermetic test environment.

Sets deterministic env vars before the app is imported so tests do not depend
on the host shell environment (e.g. a host DATABASE_URL pointing elsewhere).

Tests run against a dedicated ``bloom_test`` database — NEVER the live
``bloom`` database. Integration tests reset/clear settings rows in finally
blocks; pointing them at the live DB wiped admin-saved R2 credentials
(TEC-179). The ``bloom_test`` DB is created by docker/postgres/init.sql and
by the CI workflow's migrate step. If a host has only the ``bloom`` DB,
the integration tests skip (``_infra_up`` probes ``bloom_test``).
"""

from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://bloom:bloom_dev_password@localhost:6432/bloom_test"
os.environ["DATABASE_URL_DIRECT"] = "postgresql+psycopg://bloom:bloom_dev_password@localhost:5433/bloom_test"
os.environ["REDIS_URL"] = "redis://localhost:6380/0"
os.environ["API_ENV"] = "test"
