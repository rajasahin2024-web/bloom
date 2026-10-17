"""cms_pages.sections JSONB — structured page sections for site pages.

Revision ID: c3e5f8a1d2b4
Revises: b1c4d9e02f73
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3e5f8a1d2b4"
down_revision: str | None = "b1c4d9e02f73"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cms_pages",
        sa.Column("sections", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cms_pages", "sections")
