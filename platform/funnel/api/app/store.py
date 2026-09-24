"""SQLite order/payment store - single-file, boring, per-call connections.

orders   - one row per checkout (email, items JSON, status created->paid)
payments - one row per payment attempt (kind: base | upsell), tracks the
           rail reference (razorpay order id) and the pixel event_id used
           for CAPI dedup.

Idempotency: orders.event_id is UNIQUE so a retried checkout with the same
client event_id returns the existing order. payments has UNIQUE(order_id,
kind) so an upsell can only be created once.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from app.config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'created',
    items       TEXT NOT NULL,
    utm         TEXT,
    event_id    TEXT UNIQUE,
    created_at  TEXT NOT NULL,
    paid_at     TEXT
);
CREATE TABLE IF NOT EXISTS payments (
    id           TEXT PRIMARY KEY,
    order_id     TEXT NOT NULL REFERENCES orders(id),
    kind         TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'INR',
    rail         TEXT NOT NULL,
    rail_ref     TEXT,
    event_id     TEXT,
    status       TEXT NOT NULL DEFAULT 'created',
    created_at   TEXT NOT NULL,
    paid_at      TEXT,
    UNIQUE(order_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_payments_rail_ref ON payments(rail_ref);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    db_path = Path(get_settings().db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def _row_to_order(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "status": row["status"],
        "items": json.loads(row["items"]),
        "utm": json.loads(row["utm"]) if row["utm"] else None,
        "event_id": row["event_id"],
        "created_at": row["created_at"],
        "paid_at": row["paid_at"],
    }


def _row_to_payment(row: sqlite3.Row) -> dict[str, Any]:
    return {k: row[k] for k in row.keys()}


def create_order(
    *,
    email: str,
    items: list[dict[str, Any]],
    event_id: str | None,
    utm: dict[str, Any] | None,
    payment_kind: str,
    amount_paise: int,
    rail: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Insert order + its base payment. Returns (order, payment).

    Idempotent on event_id: a repeat checkout with the same event_id returns
    the existing order/payment instead of duplicating.
    """
    with connect() as conn:
        if event_id:
            existing = conn.execute(
                "SELECT * FROM orders WHERE event_id = ?", (event_id,)
            ).fetchone()
            if existing:
                pay = conn.execute(
                    "SELECT * FROM payments WHERE order_id = ? AND kind = ?",
                    (existing["id"], payment_kind),
                ).fetchone()
                return _row_to_order(existing), _row_to_payment(pay)

        order_id = new_id("ord")
        payment_id = new_id("pay")
        now = _now()
        conn.execute(
            "INSERT INTO orders (id, email, status, items, utm, event_id, created_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (order_id, email, "created", json.dumps(items),
             json.dumps(utm) if utm else None, event_id, now),
        )
        conn.execute(
            "INSERT INTO payments (id, order_id, kind, amount_paise, currency, rail,"
            " event_id, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (payment_id, order_id, payment_kind, amount_paise, "INR", rail,
             event_id, "created", now),
        )
        order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        pay = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        return _row_to_order(order), _row_to_payment(pay)


def get_order(order_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return _row_to_order(row) if row else None


def get_payments(order_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at",
            (order_id,),
        ).fetchall()
        return [_row_to_payment(r) for r in rows]


def get_payment(payment_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        return _row_to_payment(row) if row else None


def get_payment_by_rail_ref(rail_ref: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM payments WHERE rail_ref = ?", (rail_ref,)
        ).fetchone()
        return _row_to_payment(row) if row else None


def set_payment_rail_ref(payment_id: str, rail_ref: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE payments SET rail_ref = ? WHERE id = ?", (rail_ref, payment_id))


def pending_payment(order_id: str, payment_id: str | None = None) -> dict[str, Any] | None:
    """Return the payment to settle: by id, else the earliest pending one."""
    with connect() as conn:
        if payment_id:
            row = conn.execute(
                "SELECT * FROM payments WHERE id = ? AND order_id = ?",
                (payment_id, order_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM payments WHERE order_id = ? AND status = 'created'"
                " ORDER BY created_at LIMIT 1",
                (order_id,),
            ).fetchone()
        return _row_to_payment(row) if row else None


def create_upsell_payment(
    *, order_id: str, amount_paise: int, rail: str, event_id: str | None
) -> tuple[dict[str, Any] | None, bool]:
    """Insert the upsell payment. Returns (payment, created_new)."""
    with connect() as conn:
        existing = conn.execute(
            "SELECT * FROM payments WHERE order_id = ? AND kind = 'upsell'",
            (order_id,),
        ).fetchone()
        if existing:
            return _row_to_payment(existing), False
        payment_id = new_id("pay")
        conn.execute(
            "INSERT INTO payments (id, order_id, kind, amount_paise, currency, rail,"
            " event_id, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (payment_id, order_id, "upsell", amount_paise, "INR", rail, event_id,
             "created", _now()),
        )
        row = conn.execute("SELECT * FROM payments WHERE id = ?", (payment_id,)).fetchone()
        return _row_to_payment(row), True


def mark_payment_paid(
    payment_id: str, *, add_items: list[dict[str, Any]] | None = None
) -> dict[str, Any] | None:
    """Mark a payment paid; cascade order status for base, merge upsell items.

    Idempotent: already-paid payments return unchanged. Returns the order.
    """
    with connect() as conn:
        pay = conn.execute(
            "SELECT * FROM payments WHERE id = ?", (payment_id,)
        ).fetchone()
        if not pay:
            return None
        now = _now()
        if pay["status"] != "paid":
            conn.execute(
                "UPDATE payments SET status='paid', paid_at=? WHERE id=?",
                (now, payment_id),
            )
        order = conn.execute(
            "SELECT * FROM orders WHERE id = ?", (pay["order_id"],)
        ).fetchone()
        if pay["kind"] == "base" and order["status"] != "paid":
            conn.execute(
                "UPDATE orders SET status='paid', paid_at=? WHERE id=?",
                (now, order["id"]),
            )
        if add_items:
            items = json.loads(order["items"])
            existing_skus = {i["sku"] for i in items}
            for item in add_items:
                if item["sku"] not in existing_skus:
                    items.append(item)
            conn.execute(
                "UPDATE orders SET items=? WHERE id=?",
                (json.dumps(items), order["id"]),
            )
        order = conn.execute(
            "SELECT * FROM orders WHERE id = ?", (pay["order_id"],)
        ).fetchone()
        return _row_to_order(order)


def list_paid_orders() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM orders WHERE status = 'paid' ORDER BY paid_at"
        ).fetchall()
        return [_row_to_order(r) for r in rows]
