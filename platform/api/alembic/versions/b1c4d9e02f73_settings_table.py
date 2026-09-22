"""settings table — admin-editable platform settings store (TEC-98)

One row per known setting key, seeded from the installer's INSTITUTE_* env
plus the prototype defaults (see app.services.settings registry). Seeded rows
keep updated_by NULL so the API can report them as env defaults; admin edits
set updated_by and become DB overrides.

Revision ID: b1c4d9e02f73
Revises: 6abd22ab839d
Create Date: 2026-09-22
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.setting import Setting
from app.services.settings import seed_rows

revision: str = 'b1c4d9e02f73'
down_revision: str | None = '6abd22ab839d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('settings',
    sa.Column('key', sa.String(length=100), nullable=False),
    sa.Column('value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('group', sa.String(length=50), nullable=False),
    sa.Column('updated_by', sa.UUID(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_index(op.f('ix_settings_group'), 'settings', ['group'], unique=False)
    op.get_bind().execute(
        pg_insert(Setting).values(seed_rows()).on_conflict_do_nothing()
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_settings_group'), table_name='settings')
    op.drop_table('settings')
