"""Redis fixed-window rate limiting — per student, falling back to client IP."""

from __future__ import annotations

from fastapi import Depends
from fastapi.exceptions import HTTPException
from redis import Redis

from tutor.auth import CallerContext, caller_context
from tutor.core.config import get_settings
from tutor.core.redis import get_redis

_settings = get_settings()


def rate_limit(
    ctx: CallerContext = Depends(caller_context),
    r: Redis = Depends(get_redis),
) -> CallerContext:
    """FastAPI dependency — raises 429 when the window quota is exhausted."""
    subject = ctx.student_id or f"ip:{ctx.client_ip}"
    key = f"tutor:rl:{subject}"
    try:
        count = r.incr(key)
        if count == 1:
            r.expire(key, _settings.rate_limit_window_seconds)
    except Exception:  # noqa: BLE001 - limiter must not take the service down
        return ctx
    if count > _settings.rate_limit_requests:
        retry = r.ttl(key)
        raise HTTPException(
            status_code=429,
            detail="rate limit exceeded",
            headers={"Retry-After": str(max(int(retry), 1))},
        )
    return ctx
