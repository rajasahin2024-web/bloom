"""mail_admin_audit table + mailboxes.user_id nullable (TEC-188)

Audit trail for every admin mutation on the mail-engine surface (schema
pre-approved on TEC-188). `admin_user_id` is SET NULL so the trail survives
admin-user deletion.

`mailboxes.user_id` becomes nullable: admin-provisioned mailboxes
(POST /api/admin/mailboxes — service/staff boxes) have no owning platform
account. Downgrade deletes mirror rows with NULL user_id (they exist only
on the engine side — no platform data is lost beyond the mirror).

Revision ID: f2a8c4d91e36
Revises: e4f7a8b92c15
Create Date: 2026-11-15
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f2a8c4d91e36"
down_revision: str | None = "e4f7a8b92c15"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mail_admin_audit",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("admin_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target", sa.String(length=255), nullable=False),
        sa.Column("detail", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["admin_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mail_admin_audit_admin_user_id"),
        "mail_admin_audit",
        ["admin_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_mail_admin_audit_created_at"),
        "mail_admin_audit",
        ["created_at"],
        unique=False,
    )
    op.alter_column(
        "mailboxes",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # Re-applying NOT NULL can't keep NULL user_ids — drop their mirror rows
    # (engine-side mailboxes are unaffected; only the platform mirror goes).
    op.execute("DELETE FROM mailboxes WHERE user_id IS NULL")
    op.alter_column(
        "mailboxes",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_index(op.f("ix_mail_admin_audit_created_at"), table_name="mail_admin_audit")
    op.drop_index(op.f("ix_mail_admin_audit_admin_user_id"), table_name="mail_admin_audit")
    op.drop_table("mail_admin_audit")
