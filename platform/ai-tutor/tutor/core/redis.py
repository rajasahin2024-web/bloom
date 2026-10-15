"""Redis clients — sync (worker/CLI) and async (gateway)."""

from __future__ import annotations

import redis.asyncio as aioredis
from redis import Redis

from tutor.core.config import get_settings

_settings = get_settings()

redis_client: Redis = Redis.from_url(_settings.redis_url, decode_responses=True)
async_redis_client: aioredis.Redis = aioredis.Redis.from_url(
    _settings.redis_url, decode_responses=True
)


def get_redis() -> Redis:
    return redis_client


def get_async_redis() -> aioredis.Redis:
    return async_redis_client
