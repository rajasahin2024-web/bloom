"""enquiry_ref_seq sequence — backing sequence for Enquiry.ref (TEC-143)

`app.services.enquiries._next_ref` runs `SELECT nextval('enquiry_ref_seq')`
but no migration ever created the sequence, so POST /api/enquiries 500'd
(UndefinedTable) and contact-form leads were silently lost.

Revision ID: d9f3a1c74e28
Revises: c3e5f8a1d2b4
Create Date: 2026-10-29
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = 'd9f3a1c74e28'
down_revision: str | None = 'c3e5f8a1d2b4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # IF NOT EXISTS keeps this safe on databases where the sequence was
    # already created out-of-band to stop the 500s.
    op.execute("CREATE SEQUENCE IF NOT EXISTS enquiry_ref_seq")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS enquiry_ref_seq")
