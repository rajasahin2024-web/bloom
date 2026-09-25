"""Gated-area learner store - same SQLite file, per-call connections.

buyer_sessions - bearer-token sessions minted by email + order-id login.
           Only the sha256 hash of the token is stored; the raw token is
           returned to the buyer once and never persisted.
quiz_attempts - append-only quiz submissions. A module counts as passed
           when ANY attempt for it passed (mock-test semantics: retakes
           allowed, best knowledge wins).
certificates - one row per issued certificate of completion. UNIQUE on
           order_id so a re-issue returns the existing certificate.
"""

from __future__ import annotations

import hashlib
import secrets
from typing import Any

from app.store import _now, connect, new_id

SCHEMA = """
CREATE TABLE IF NOT EXISTS buyer_sessions (
    id           TEXT PRIMARY KEY,
    order_id     TEXT NOT NULL REFERENCES orders(id),
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_order ON buyer_sessions(order_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES orders(id),
    module_id  TEXT NOT NULL,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    passed     INTEGER NOT NULL DEFAULT 0,
    answers    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_order_module
    ON quiz_attempts(order_id, module_id);

CREATE TABLE IF NOT EXISTS certificates (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL UNIQUE REFERENCES orders(id),
    serial      TEXT NOT NULL UNIQUE,
    buyer_name  TEXT NOT NULL,
    course_name TEXT NOT NULL,
    issued_at   TEXT NOT NULL
);
"""


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(order_id: str, ttl_seconds: int) -> tuple[str, str]:
    """Mint a buyer session. Returns (raw_token, expires_at_iso)."""
    import datetime as _dt

    token = "fns_" + secrets.token_hex(24)
    now = _dt.datetime.now(_dt.timezone.utc)
    exp = now + _dt.timedelta(seconds=ttl_seconds)
    with connect() as conn:
        conn.execute(
            "INSERT INTO buyer_sessions (id, order_id, token_hash, created_at,"
            " expires_at) VALUES (?,?,?,?,?)",
            (new_id("ses"), order_id, _hash_token(token),
             now.isoformat(timespec="seconds"), exp.isoformat(timespec="seconds")),
        )
    return token, exp.isoformat(timespec="seconds")


def session_for_token(token: str) -> dict[str, Any] | None:
    """Resolve a raw bearer token to a live session row, else None."""
    if not token or not token.startswith("fns_"):
        return None
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM buyer_sessions WHERE token_hash = ?",
            (_hash_token(token),),
        ).fetchone()
        if not row:
            return None
        if row["expires_at"] <= _now():
            conn.execute("DELETE FROM buyer_sessions WHERE id = ?", (row["id"],))
            return None
        conn.execute(
            "UPDATE buyer_sessions SET last_seen_at = ? WHERE id = ?",
            (_now(), row["id"]),
        )
        return {k: row[k] for k in row.keys()}


def record_quiz_attempt(
    *,
    order_id: str,
    module_id: str,
    score: int,
    total: int,
    passed: bool,
    answers_json: str,
) -> dict[str, Any]:
    attempt_id = new_id("qat")
    with connect() as conn:
        conn.execute(
            "INSERT INTO quiz_attempts (id, order_id, module_id, score, total,"
            " passed, answers, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (attempt_id, order_id, module_id, score, total, int(passed),
             answers_json, _now()),
        )
        row = conn.execute(
            "SELECT * FROM quiz_attempts WHERE id = ?", (attempt_id,)
        ).fetchone()
        return {k: row[k] for k in row.keys()}


def module_progress(order_id: str) -> dict[str, dict[str, Any]]:
    """Aggregate per module for one buyer: attempts, best score, passed."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT module_id, COUNT(*) AS attempts, MAX(score) AS best_score,"
            " MAX(total) AS total, MAX(passed) AS passed,"
            " MAX(created_at) AS last_attempt_at"
            " FROM quiz_attempts WHERE order_id = ? GROUP BY module_id",
            (order_id,),
        ).fetchall()
    return {
        r["module_id"]: {
            "attempts": r["attempts"],
            "best_score": r["best_score"],
            "total": r["total"],
            "passed": bool(r["passed"]),
            "last_attempt_at": r["last_attempt_at"],
        }
        for r in rows
    }


def passed_modules(order_id: str) -> set[str]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT module_id FROM quiz_attempts"
            " WHERE order_id = ? AND passed = 1",
            (order_id,),
        ).fetchall()
    return {r["module_id"] for r in rows}


def get_certificate(order_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM certificates WHERE order_id = ?", (order_id,)
        ).fetchone()
        return {k: row[k] for k in row.keys()} if row else None


def create_certificate(
    *, order_id: str, serial: str, buyer_name: str, course_name: str
) -> dict[str, Any]:
    """Insert the certificate row; UNIQUE(order_id) makes re-issue idempotent."""
    with connect() as conn:
        existing = conn.execute(
            "SELECT * FROM certificates WHERE order_id = ?", (order_id,)
        ).fetchone()
        if existing:
            return {k: existing[k] for k in existing.keys()}
        cert_id = new_id("crt")
        conn.execute(
            "INSERT INTO certificates (id, order_id, serial, buyer_name,"
            " course_name, issued_at) VALUES (?,?,?,?,?,?)",
            (cert_id, order_id, serial, buyer_name, course_name, _now()),
        )
        row = conn.execute(
            "SELECT * FROM certificates WHERE id = ?", (cert_id,)
        ).fetchone()
        return {k: row[k] for k in row.keys()}
