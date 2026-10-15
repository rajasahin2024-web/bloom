"""Redis queue + per-job event streams.

Topology:
  gateway LPUSH  tutor:queue:chat            (job JSON, FIFO — workers pop RIGHT)
  worker  BLMOVE tutor:queue:chat -> tutor:queue:chat:processing
          XADD   tutor:job:{id}:events       (typed events the gateway streams)
          HSET   tutor:job:{id}              (status snapshot for GET /chat/{id})
  gateway XREAD  tutor:job:{id}:events       (SSE fan-out, replayable via GET)

Both per-job keys carry a TTL so Redis self-cleans. The processing list gives
at-least-once delivery: entries are removed only after the job finishes, and a
stale sweep moves crashed-worker entries back to the queue (attempts bounded).
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as aioredis
from redis import Redis

from tutor.core.config import get_settings
from tutor.schemas import ChatJobPayload

log = logging.getLogger(__name__)

_settings = get_settings()

TERMINAL_EVENTS = ("done", "error")


def processing_queue_key() -> str:
    return f"{_settings.chat_queue_key}:processing"


def job_key(job_id: str) -> str:
    return f"tutor:job:{job_id}"


def job_events_key(job_id: str) -> str:
    return f"tutor:job:{job_id}:events"


def idem_key(key: str) -> str:
    return f"tutor:idem:{key}"


def _expire_job_keys(r: Redis, job_id: str) -> None:
    r.expire(job_key(job_id), _settings.job_ttl_seconds)
    r.expire(job_events_key(job_id), _settings.job_ttl_seconds)


def publish_event(r: Redis, job_id: str, event_type: str, data: dict[str, Any]) -> None:
    """Append an event to the job stream and refresh its status hash."""
    r.xadd(
        job_events_key(job_id),
        {"type": event_type, "data": json.dumps(data, default=str)},
    )
    status = {"done": "done", "error": "failed"}.get(event_type, "running")
    r.hset(job_key(job_id), mapping={"status": status, "last_event": event_type})
    _expire_job_keys(r, job_id)


async def enqueue_chat(r: aioredis.Redis, payload: ChatJobPayload) -> None:
    """Mark the job queued and push it onto the worker queue."""
    await r.hset(
        job_key(payload.job_id),
        mapping={
            "status": "queued",
            "student_id": payload.student_id or "",
            "enqueued_at": str(payload.enqueued_at),
        },
    )
    await r.expire(job_key(payload.job_id), _settings.job_ttl_seconds)
    await publish_event_async(
        r,
        payload.job_id,
        "meta",
        {"job_id": payload.job_id, "student_id": payload.student_id, "state": "queued"},
    )
    # Reset status back to queued — publish_event marks every event "running".
    await r.hset(job_key(payload.job_id), "status", "queued")
    await r.lpush(_settings.chat_queue_key, payload.model_dump_json())


async def publish_event_async(
    r: aioredis.Redis, job_id: str, event_type: str, data: dict[str, Any]
) -> None:
    await r.xadd(
        job_events_key(job_id),
        {"type": event_type, "data": json.dumps(data, default=str)},
    )
    await r.expire(job_events_key(job_id), _settings.job_ttl_seconds)


async def resolve_idempotency(r: aioredis.Redis, key: str) -> str | None:
    """Return the existing job_id for an idempotency key, or None."""
    return await r.get(idem_key(key))


async def record_idempotency(r: aioredis.Redis, key: str, job_id: str) -> bool:
    """Bind key -> job_id. Returns False if the key was already taken."""
    return bool(await r.set(idem_key(key), job_id, nx=True, ex=_settings.job_ttl_seconds))


async def get_job_status(r: aioredis.Redis, job_id: str) -> dict[str, str] | None:
    data = await r.hgetall(job_key(job_id))
    return data or None


async def iter_job_events(
    r: aioredis.Redis, job_id: str, timeout_seconds: float
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    """Yield (event_type, data) from the job stream until terminal/timeout.

    Reads from the beginning so a subscriber attaching late still gets `meta`
    and any buffered tokens; XREAD BLOCK bounds the poll latency.
    """
    key = job_events_key(job_id)
    last_id = "0-0"
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        block_ms = max(1000, int((deadline - time.monotonic()) * 1000))
        resp = await r.xread({key: last_id}, block=min(block_ms, 5000), count=100)
        if resp:
            for _stream, entries in resp:
                for entry_id, fields in entries:
                    last_id = entry_id
                    event_type = fields.get("type", "message")
                    try:
                        data = json.loads(fields.get("data", "{}"))
                    except json.JSONDecodeError:
                        data = {"raw": fields.get("data", "")}
                    yield event_type, data
                    if event_type in TERMINAL_EVENTS:
                        return


def dequeue_blocking(r: Redis, timeout: int = 5) -> str | None:
    """Atomically move the oldest queued job to the processing list (FIFO)."""
    return r.blmove(
        _settings.chat_queue_key,
        processing_queue_key(),
        timeout=timeout,
        src="RIGHT",
        dest="LEFT",
    )


def ack_processing(r: Redis, raw: str) -> None:
    r.lrem(processing_queue_key(), 1, raw)


def requeue_stale(r: Redis) -> int:
    """Move expired processing entries back to the queue (at-least-once).

    Entries older than `worker_stale_seconds` are retried until
    `job_max_attempts`, then surfaced as a failed job on its event stream.
    Returns the number of entries moved.
    """
    moved = 0
    now = time.time()
    for raw in r.lrange(processing_queue_key(), 0, -1):
        try:
            payload = ChatJobPayload.model_validate_json(raw)
        except Exception:  # noqa: BLE001 - drop undecodable entries
            r.lrem(processing_queue_key(), 1, raw)
            continue
        if now - payload.enqueued_at < _settings.worker_stale_seconds:
            continue
        r.lrem(processing_queue_key(), 1, raw)
        if payload.attempt + 1 >= _settings.job_max_attempts:
            publish_event(
                r,
                payload.job_id,
                "error",
                {"message": "job expired after max attempts", "job_id": payload.job_id},
            )
            moved += 1
            continue
        payload.attempt += 1
        r.lpush(_settings.chat_queue_key, payload.model_dump_json())
        publish_event(
            r,
            payload.job_id,
            "status",
            {"state": "requeued", "attempt": payload.attempt, "job_id": payload.job_id},
        )
        moved += 1
    return moved
