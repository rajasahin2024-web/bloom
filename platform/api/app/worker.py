"""Redis worker — drains the mail provisioning queue (TEC-184).

Run: `python -m app.worker` (docker-compose `worker` service).

Loop: promote due retries → BRPOP ready jobs → process → periodic sweeper
rescue for lost enqueues/crashes. Single-worker design: sequential processing
bounds concurrency naturally, and every job is idempotent on the mailbox row
so at-least-once delivery converges.
"""

from __future__ import annotations

import json
import logging
import signal
import time

from app.core.database import new_session
from app.core.redis import get_redis
from app.integrations import mail_api
from app.services import mail_jobs

logger = logging.getLogger(__name__)

BRPOP_TIMEOUT_SECONDS = 2
SWEEP_INTERVAL_SECONDS = 60

_stop = False


def _handle_signal(signum: int, _frame: object) -> None:
    global _stop
    logger.info("worker received signal %s — draining and exiting", signum)
    _stop = True


def run_once() -> None:
    """One loop iteration — promote retries, then process at most one job."""
    redis = get_redis()
    mail_jobs.promote_due(redis)
    job = mail_jobs.pop_ready(redis, timeout=BRPOP_TIMEOUT_SECONDS)
    if job is None:
        return
    db = new_session()
    if db is None:
        logger.error("DB not configured — requeueing mail job")
        redis.lpush(mail_jobs.QUEUE_READY, json.dumps(job))
        return
    try:
        mail_jobs.process_job(db, redis, mail_api.get_mail_provisioner(), job)
    finally:
        db.close()


def sweep_once() -> None:
    db = new_session()
    if db is None:
        return
    try:
        mail_jobs.sweep_stale(db, get_redis())
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    logger.info("mail provisioning worker started")
    last_sweep = 0.0
    while not _stop:
        try:
            run_once()
        except Exception:  # noqa: BLE001 — the loop must never die
            logger.exception("worker iteration failed")
            time.sleep(1)
        now = time.monotonic()
        if now - last_sweep >= SWEEP_INTERVAL_SECONDS:
            last_sweep = now
            try:
                sweep_once()
            except Exception:  # noqa: BLE001
                logger.exception("mail sweeper failed")
    logger.info("mail provisioning worker stopped")


if __name__ == "__main__":
    main()
