"""Auth passthrough.

The gateway does not validate tokens itself — authN lives in the platform API.
Callers send `Authorization: Bearer <platform-token>` plus `X-Student-Id`; the
gateway forwards the student identity into the job payload so workers get
context without ever seeing credentials (the token is never put on the queue).

When `TUTOR_AUTH_REQUIRED=false` (default for local dev) requests without
credentials are allowed through as `student_id=None`.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from fastapi.exceptions import HTTPException

from tutor.core.config import get_settings

_settings = get_settings()


@dataclass(frozen=True)
class CallerContext:
    student_id: str | None
    has_bearer: bool
    client_ip: str


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return token.strip()
    return None


async def caller_context(request: Request) -> CallerContext:
    """FastAPI dependency — extract caller identity, enforce auth if required."""
    token = _bearer_token(request)
    student_id = request.headers.get("x-student-id") or None
    if _settings.auth_required and token is None:
        raise HTTPException(status_code=401, detail="missing bearer token")
    client_ip = request.client.host if request.client else "unknown"
    return CallerContext(student_id=student_id, has_bearer=token is not None, client_ip=client_ip)
