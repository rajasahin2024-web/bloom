"""Redis client (cache + queue)."""

from __future__ import annotations

from redis import Redis

from app.core.config import get_settings

_settings = get_settings()

redis_client: Redis = Redis.from_url(_settings.redis_url, decode_responses=True)


def get_redis() -> Redis:
    return redis_client
