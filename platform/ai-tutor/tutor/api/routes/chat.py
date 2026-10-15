"""Chat routes — `POST /chat` (SSE stream) + `GET /chat/{job_id}` (status).

Flow: auth passthrough -> rate limit -> enqueue job on Redis -> stream the
worker's event stream back as Server-Sent Events until `done`/`error`/timeout.

Retries are safe: a client that resends the same `Idempotency-Key` header is
attached to the already-running job's stream instead of enqueueing a duplicate.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse

from tutor.auth import CallerContext
from tutor.core.config import get_settings
from tutor.core.redis import get_async_redis
from tutor.queue import (
    enqueue_chat,
    get_job_status,
    iter_job_events,
    job_events_key,
    record_idempotency,
    resolve_idempotency,
)
from tutor.ratelimit import rate_limit
from tutor.schemas import ChatJobPayload, ChatRequest, JobStatus

router = APIRouter(tags=["chat"])

_settings = get_settings()

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",  # disable proxy buffering so tokens flush
}


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


async def _stream_job(
    request: Request, r: aioredis.Redis, job_id: str
) -> AsyncIterator[str]:
    """Yield SSE frames for a job until a terminal event, timeout, or disconnect."""
    async for event_type, data in iter_job_events(r, job_id, _settings.job_timeout_seconds):
        if await request.is_disconnected():
            return
        yield _sse(event_type, data)
        if event_type in ("done", "error"):
            return
    yield _sse("error", {"job_id": job_id, "message": "stream timed out waiting for worker"})


@router.post("/chat")
async def chat(
    body: ChatRequest,
    request: Request,
    ctx: CallerContext = Depends(rate_limit),
    r: aioredis.Redis = Depends(get_async_redis),
) -> StreamingResponse:
    idem = request.headers.get("idempotency-key")
    if idem:
        existing = await resolve_idempotency(r, idem)
        if existing is not None:
            if not await r.exists(job_events_key(existing)):
                raise HTTPException(
                    status_code=409,
                    detail="idempotency key refers to an expired job",
                )
            return StreamingResponse(
                _stream_job(request, r, existing),
                media_type="text/event-stream",
                headers={**SSE_HEADERS, "X-Job-Id": existing, "X-Idempotent-Replay": "true"},
            )

    payload = ChatJobPayload(
        student_id=ctx.student_id, question=body.question, module=body.module
    )
    if idem and not await record_idempotency(r, idem, payload.job_id):
        # Lost the race to an identical in-flight request — attach to that job.
        existing = await resolve_idempotency(r, idem)
        if existing:
            return StreamingResponse(
                _stream_job(request, r, existing),
                media_type="text/event-stream",
                headers={**SSE_HEADERS, "X-Job-Id": existing, "X-Idempotent-Replay": "true"},
            )

    try:
        await enqueue_chat(r, payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="job queue unavailable") from exc

    return StreamingResponse(
        _stream_job(request, r, payload.job_id),
        media_type="text/event-stream",
        headers={**SSE_HEADERS, "X-Job-Id": payload.job_id},
    )


@router.get("/chat/{job_id}")
async def chat_status(
    job_id: str,
    r: aioredis.Redis = Depends(get_async_redis),
) -> JobStatus:
    job = await get_job_status(r, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found or expired")
    return JobStatus(job_id=job_id, status=job.get("status", "unknown"))
