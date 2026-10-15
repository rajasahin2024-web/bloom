"""Worker pool entrypoint — `python -m tutor.worker`.

Stateless worker: BLMOVE pops a job from the shared Redis queue into the
processing list (at-least-once), runs the LangGraph graph, publishes events to
the job's stream, then ACKs by removing the processing entry. Replicas scale
horizontally — `docker compose up --scale worker=N` — because every worker
competes for the same queue.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import socket
import time

from redis import Redis, RedisError

from tutor.core.config import get_settings
from tutor.core.database import SessionLocal
from tutor.core.redis import get_redis
from tutor.embeddings import get_embedder
from tutor.graph import TutorDeps, build_graph
from tutor.llm import get_llm
from tutor.queue import (
    ack_processing,
    dequeue_blocking,
    publish_event,
    requeue_stale,
)
from tutor.schemas import ChatJobPayload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
)
log = logging.getLogger("tutor.worker")

_settings = get_settings()
WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"


async def run_job(payload: ChatJobPayload, r: Redis, deps: TutorDeps) -> None:
    """Execute one chat job: run the graph, publishing events to the stream."""

    def emit(event_type: str, data: dict) -> None:
        publish_event(r, payload.job_id, event_type, data)

    emit("status", {"state": "picked_up", "worker": WORKER_ID, "job_id": payload.job_id})
    try:
        graph = build_graph(deps)
        await graph.ainvoke(
            {
                "job_id": payload.job_id,
                "student_id": payload.student_id,
                "question": payload.question,
                "module": payload.module,
            },
            config={"configurable": {"emit": emit}},
        )
        emit("done", {"job_id": payload.job_id})
    except Exception as exc:  # noqa: BLE001 - report failures on the job stream
        log.exception("job %s failed", payload.job_id)
        emit("error", {"job_id": payload.job_id, "message": str(exc)[:500]})


def main() -> None:
    r = get_redis()
    deps = TutorDeps(
        session_factory=SessionLocal,
        embedder=get_embedder(_settings),
        llm=get_llm(_settings),
        top_k=_settings.retrieval_top_k,
    )

    stop = False

    def _handle(_sig: int, _frame: object) -> None:
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, _handle)
    signal.signal(signal.SIGINT, _handle)

    log.info(
        "worker %s online — queue=%s llm=%s embeddings=%s",
        WORKER_ID,
        _settings.chat_queue_key,
        _settings.llm_provider,
        _settings.embedding_provider,
    )

    while not stop:
        try:
            requeue_stale(r)
            raw = dequeue_blocking(r, timeout=5)
        except RedisError as exc:
            log.warning("redis error: %s — retrying", exc)
            time.sleep(2)
            continue
        if raw is None:
            continue
        try:
            payload = ChatJobPayload.model_validate_json(raw)
        except Exception:  # noqa: BLE001 - drop undecodable jobs
            log.error("dropping undecodable job payload")
            ack_processing(r, raw)
            continue
        try:
            asyncio.run(run_job(payload, r, deps))
        finally:
            ack_processing(r, raw)

    log.info("worker %s stopped", WORKER_ID)


if __name__ == "__main__":
    main()
