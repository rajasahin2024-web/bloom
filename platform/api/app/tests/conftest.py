"""Pytest configuration — hermetic test environment.

Sets deterministic env vars before the app is imported so tests do not depend
on the host shell environment (e.g. a host DATABASE_URL pointing elsewhere).
"""

from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://bloom:bloom_dev_password@localhost:6432/bloom"
os.environ["DATABASE_URL_DIRECT"] = "postgresql+psycopg://bloom:bloom_dev_password@localhost:5433/bloom"
os.environ["REDIS_URL"] = "redis://localhost:6380/0"
os.environ["API_ENV"] = "test"
