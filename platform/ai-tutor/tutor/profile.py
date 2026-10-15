"""Student profile node backing — reads learner context from Postgres.

The platform schema is owned by the main API (Stage 1a). The tutor reads it
read-only and tolerates it not existing yet: if `students` is absent (or the
shape differs), the node returns an empty profile rather than failing the chat.
M2 (TEC-70) replaces this best-effort reflection with the frozen contract.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

# Whitelisted keys copied into the LLM context when present on the row.
PROFILE_KEYS = (
    "name",
    "full_name",
    "exam_track",
    "target_band",
    "current_band",
    "cefr_level",
    "weakest_module",
    "weak_modules",
)


def load_profile(db: Session, student_id: str | None) -> dict[str, Any]:
    """Best-effort student context. Never raises — empty dict on any miss."""
    if not student_id:
        return {}
    try:
        if not inspect(db.get_bind()).has_table("students"):
            return {}
        row = (
            db.execute(text("SELECT * FROM students WHERE id = :sid LIMIT 1"), {"sid": student_id})
            .mappings()
            .first()
        )
        if not row:
            return {}
        return {k: v for k, v in dict(row).items() if k in PROFILE_KEYS and v is not None}
    except Exception:  # noqa: BLE001 - profile context is best-effort
        return {}
