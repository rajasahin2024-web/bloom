"""cms_posts view_count: public view counter for posts (TEC-202).

Additive-only expansion: ``view_count INTEGER NOT NULL DEFAULT 0`` is a
catalog-only ``ADD COLUMN … DEFAULT`` on PG11+ (no table rewrite), plus a
plain index for admin "sort by views".

Revision ID: b8d2f4a61c39
Revises: f2a8c4d91e36
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "b8d2f4a61c39"
down_revision: str | None = "f2a8c4d91e36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "cms_posts",
        sa.Column(
            "view_count", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.create_index(
        "ix_cms_posts_view_count", "cms_posts", ["view_count"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_cms_posts_view_count", table_name="cms_posts")
    op.drop_column("cms_posts", "view_count")
