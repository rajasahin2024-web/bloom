"""Redis client (cache + queue).

The client is built lazily and rebuilt if REDIS_URL changes (e.g. after the
first-run setup wizard writes `.env`), so no restart is required post-setup.
"""

from __future__ import annotations

import threading

from redis import Redis

from app.core.config import get_settings

_client: Redis | None = None
_client_url: str | None = None
_lock = threading.Lock()


def get_redis() -> Redis:
    """Return the shared Redis client, (re)building it if the URL changed."""
    global _client, _client_url
    url = get_settings().redis_url
    if _client is not None and _client_url == url:
        return _client
    with _lock:
        if _client is None or _client_url != url:
            _client = Redis.from_url(url, decode_responses=True)
            _client_url = url
    return _client
