"""mailboxes table — platform mirror of provisioned mailboxes (TEC-184)

One row per academy mailbox, created atomically with the signup; the Redis
worker drives status transitions (pending → queued → provisioning → active |
failed | suspended). `localpart` is the create_mailbox idempotency key —
unique at the DB level. `mail_secret` is transient (argon2id hash held only
until provisioning confirms; cleared on success).

Revision ID: e4f7a8b92c15
Revises: a7f3e2c91d05
Create Date: 2026-11-04
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e4f7a8b92c15"
down_revision: str | None = "a7f3e2c91d05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mailboxes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("localpart", postgresql.CITEXT(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "queued",
                "provisioning",
                "active",
                "suspended",
                "failed",
                name="mailbox_status",
            ),
            nullable=False,
        ),
        sa.Column("quota_mb", sa.Integer(), nullable=False),
        sa.Column("mail_secret", sa.String(length=255), nullable=True),
        sa.Column("provisioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("localpart"),
    )
    op.create_index(op.f("ix_mailboxes_status"), "mailboxes", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mailboxes_status"), table_name="mailboxes")
    op.drop_table("mailboxes")
    sa.Enum(name="mailbox_status").drop(op.get_bind())
