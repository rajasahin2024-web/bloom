"""Mail provisioning queue — Redis transport + backoff + job processing (TEC-184).

Storage layout (Redis):
    mail:jobs:ready  — LIST of job payloads, LPUSH producer / BRPOP worker
    mail:jobs:retry  — ZSET payload → epoch at which it becomes due again

Job payload: {"job_id", "kind", "mailbox_id"} — deliberately tiny. The
`mailboxes` row is the source of truth (status, attempts, mail_secret), so a
worker crash mid-job or a lost enqueue self-heals via `sweep_stale`, and no
secret ever transits Redis.

Retry semantics per contracts/mail-provisioning.yaml: retryable errors back
off exponentially (`base * 2^(attempt-1)`, capped at 1h, ≤25% jitter, honoring
Retry-After) up to `mail_provision_max_attempts`, then the row goes `failed`
for admin review (and its `mail_secret` is purged — the hash is held only
while an attempt can still run; admin retry re-enters a fresh password).
Non-retryable codes fail fast.
"""

from __future__ import annotations

import json
import logging
import random
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, cast

from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.mail_api import MailError, MailProvisioner
from app.models.enums import MailboxStatus
from app.models.mailbox import Mailbox
from app.models.user import User

logger = logging.getLogger(__name__)

QUEUE_READY = "mail:jobs:ready"
QUEUE_RETRY = "mail:jobs:retry"

# Sweeper grace periods: pending = enqueue never landed; provisioning = worker
# died mid-attempt; queued = queue entry lost (e.g. Redis restart).
PENDING_GRACE = timedelta(seconds=60)
PROVISIONING_GRACE = timedelta(minutes=10)
QUEUED_GRACE = timedelta(minutes=30)


def _payload(mailbox_id: uuid.UUID) -> str:
    return json.dumps(
        {
            "job_id": str(uuid.uuid4()),
            "kind": "create_mailbox",
            "mailbox_id": str(mailbox_id),
        }
    )


def enqueue_create(redis: Redis, mailbox_id: uuid.UUID) -> bool:
    """LPUSH a create_mailbox job. False on Redis failure — the row stays
    `pending` and the sweeper re-enqueues it."""
    try:
        redis.lpush(QUEUE_READY, _payload(mailbox_id))
        return True
    except RedisError:
        logger.exception("mail queue enqueue failed for mailbox %s", mailbox_id)
        return False


def pop_ready(redis: Redis, timeout: int = 2) -> dict[str, Any] | None:
    """BRPOP one job payload; None on timeout."""
    item = redis.brpop(QUEUE_READY, timeout=timeout)
    if item is None:
        return None
    _, raw = item
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        logger.warning("discarding malformed mail job payload: %.200r", raw)
        return None


def promote_due(redis: Redis, now: float | None = None) -> int:
    """Move due retry entries back to the ready list; returns count moved."""
    due = cast(
        list[tuple[str, float]],
        redis.zrangebyscore(
            QUEUE_RETRY, "-inf", now or utcnow_ts(), start=0, num=100, withscores=True
        ),
    )
    moved = 0
    for raw, _score in due:
        pipe = redis.pipeline()
        pipe.zrem(QUEUE_RETRY, raw)
        pipe.lpush(QUEUE_READY, raw)
        zrem_result, _ = pipe.execute()
        if zrem_result:
            moved += 1
    return moved


def utcnow_ts() -> float:
    return float(datetime.now(UTC).timestamp())


def backoff_seconds(attempts: int, retry_after: float | None = None) -> float:
    """Exponential backoff per contract: base*2^(attempt-1), 1h cap, ≤25%
    jitter; retry_after (from 429/503) raises the floor."""
    settings = get_settings()
    delay: float = min(
        settings.mail_provision_base_delay_seconds * (2 ** max(attempts - 1, 0)),
        3600.0,
    )
    delay *= 1 + random.uniform(0, 0.25)
    if retry_after:
        delay = max(delay, retry_after)
    return delay


def process_job(
    db: Session, redis: Redis, provisioner: MailProvisioner, job: dict[str, Any]
) -> None:
    """Run one job through the mailbox state machine. Never raises."""
    mailbox_id = job.get("mailbox_id")
    try:
        mailbox_pk = uuid.UUID(str(mailbox_id))
    except (ValueError, AttributeError):
        mailbox_pk = None
    row = db.get(Mailbox, mailbox_pk) if mailbox_pk is not None else None
    if row is None:
        logger.warning("mail job for unknown mailbox_id=%s — dropped", mailbox_id)
        return
    if row.status == MailboxStatus.active:
        return  # already converged — replay is a no-op
    mail_secret = row.mail_secret
    if mail_secret is None:
        row.status = MailboxStatus.failed
        row.last_error = "missing provisioning secret"
        db.commit()
        return

    row.status = MailboxStatus.provisioning
    row.attempts += 1
    db.commit()

    display_name = db.scalar(select(User.full_name).where(User.id == row.user_id))
    try:
        provisioner.create_mailbox(
            localpart=row.localpart,
            secret=mail_secret,
            quota_mb=row.quota_mb,
            display_name=display_name,
        )
    except MailError as exc:
        settings = get_settings()
        # Provider detail stays in logs; the admin-visible column gets the
        # taxonomy code + generic text only (Security gate C3).
        row.last_error = f"{exc.code}: provisioning call failed"[:500]
        if exc.retryable and row.attempts < settings.mail_provision_max_attempts:
            delay = backoff_seconds(row.attempts, exc.retry_after)
            row.status = MailboxStatus.queued
            db.commit()
            redis.zadd(QUEUE_RETRY, {_payload(row.id): utcnow_ts() + delay})
            logger.info(
                "mailbox %s retry %s/%s in %.0fs (%s)",
                row.localpart,
                row.attempts,
                settings.mail_provision_max_attempts,
                delay,
                exc.code,
            )
        else:
            row.status = MailboxStatus.failed
            # Terminal state — purge the stored secret (TEC-187). The hash is
            # plaintext-equivalent to the provider and no code path consumes
            # it again; admin retry supplies a fresh password.
            row.mail_secret = None
            db.commit()
            logger.warning(
                "mailbox %s provisioning failed permanently (%s): %s",
                row.localpart,
                exc.code,
                exc,
            )
        return
    except Exception:  # noqa: BLE001 — unexpected faults retry like unavailable
        db.rollback()
        row = db.get(Mailbox, mailbox_pk)
        if row is not None:
            row.status = MailboxStatus.queued
            row.last_error = "internal worker error"[:500]
            db.commit()
            redis.zadd(
                QUEUE_RETRY, {_payload(row.id): utcnow_ts() + backoff_seconds(row.attempts)}
            )
        logger.exception("mail job crashed for mailbox %s", mailbox_id)
        return

    row.status = MailboxStatus.active
    row.provisioned_at = datetime.now(UTC)
    row.mail_secret = None  # plaintext-equivalent material no longer needed
    row.last_error = None
    db.commit()
    logger.info("mailbox provisioned: %s (attempts=%s)", row.localpart, row.attempts)


def sweep_stale(db: Session, redis: Redis) -> int:
    """Re-enqueue mirror rows whose queue entry was lost. Returns rows rescued.

    - `pending` older than grace → enqueue never landed (post-commit failure)
    - `provisioning` older than grace → worker died mid-attempt
    - `queued` older than grace → queue entry lost (Redis restart/eviction)
    """
    now = datetime.now(UTC)
    stale = db.scalars(
        select(Mailbox).where(
            (Mailbox.status == MailboxStatus.pending)
            & (Mailbox.updated_at < now - PENDING_GRACE)
            | (Mailbox.status == MailboxStatus.provisioning)
            & (Mailbox.updated_at < now - PROVISIONING_GRACE)
            | (Mailbox.status == MailboxStatus.queued)
            & (Mailbox.updated_at < now - QUEUED_GRACE)
        )
    ).all()
    rescued = 0
    for row in stale:
        if enqueue_create(redis, row.id):
            row.status = MailboxStatus.queued
            rescued += 1
    if stale:
        db.commit()
    if rescued:
        logger.info("mail sweeper re-enqueued %s stale mailbox(es)", rescued)
    return rescued
