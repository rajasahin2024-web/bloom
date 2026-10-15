"""Pydantic schemas — API request/response shapes and the Redis job payload.

These are the wire contract between the gateway, the queue, and the workers.
"""

from __future__ import annotations

import time
import uuid as uuidlib

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """`POST /chat` request body. Student identity comes from auth headers."""

    question: str = Field(min_length=1, max_length=4000)
    # Optional IELTS module hint ("listening" | "reading" | "writing" | "speaking")
    # — used to bias retrieval and the tutor persona.
    module: str | None = Field(default=None, max_length=32)


class ChatJobPayload(BaseModel):
    """Serialized onto the Redis queue; consumed by the worker pool."""

    job_id: str = Field(default_factory=lambda: str(uuidlib.uuid4()))
    student_id: str | None = None
    question: str
    module: str | None = None
    enqueued_at: float = Field(default_factory=time.time)
    attempt: int = 0


class Citation(BaseModel):
    """One retrieved KB chunk cited in an answer."""

    n: int  # 1-based citation marker used in the streamed text ([1], [2], ...)
    chunk_id: str
    doc_title: str
    source: str
    distance: float


class JobStatus(BaseModel):
    """`GET /chat/{job_id}` response — job lifecycle snapshot."""

    job_id: str
    status: str  # queued | running | done | failed
    detail: str | None = None
