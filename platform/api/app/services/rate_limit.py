"""Fixed-window rate limiting backed by Redis counters.

Storage layout (Redis):
    rl:{bucket}:{ident} → hit counter; expires `window` after the first hit
"""

from __future__ import annotations

from redis import Redis


def hit(redis: Redis, bucket: str, ident: str, limit: int, window_seconds: int) -> bool:
    """Record one hit for `ident` in `bucket`; True while the count <= `limit`.

    Fixed window — the counter expires `window_seconds` after the first hit.
    `SET NX EX` + `INCR` in a single pipeline keeps key creation and TTL
    atomic, so a counter can never outlive its window.
    """
    key = f"rl:{bucket}:{ident}"
    pipe = redis.pipeline()
    pipe.set(key, 0, ex=window_seconds, nx=True)
    pipe.incr(key)
    _, count = pipe.execute()
    return int(count) <= limit
