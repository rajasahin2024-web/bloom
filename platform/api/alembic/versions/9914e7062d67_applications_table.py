"""applications table — careers page intake (TEC-144)

`POST /api/applications` persists job applications submitted on /careers,
mirroring the enquiries table. Includes `application_ref_seq` in the same
migration — TEC-143 showed what happens when the backing sequence lands
separately from the code that uses it.

Revision ID: 9914e7062d67
Revises: d9f3a1c74e28
Create Date: 2026-10-29
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '9914e7062d67'
down_revision: str | None = 'd9f3a1c74e28'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS application_ref_seq")
    op.create_table('applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('ref', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('email', postgresql.CITEXT(), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('vacancy', sa.String(length=50), nullable=True),
        sa.Column('role_title', sa.String(length=200), nullable=True),
        sa.Column('years', sa.Integer(), nullable=True),
        sa.Column('examiner', sa.String(length=100), nullable=True),
        sa.Column('office', sa.String(length=50), nullable=True),
        sa.Column('office_name', sa.String(length=200), nullable=True),
        sa.Column('cv', sa.String(length=500), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('stage', sa.Enum('applied', 'screen', 'demo', 'interview', 'offer', 'hired', 'declined', name='application_stage'), nullable=False),
        sa.Column('idempotency_key', sa.String(length=100), nullable=True),
        sa.Column('alert_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('alert_error', sa.Text(), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key')
    )
    op.create_index(op.f('ix_applications_ref'), 'applications', ['ref'], unique=True)
    op.create_index(op.f('ix_applications_stage'), 'applications', ['stage'], unique=False)
    op.create_index('ix_applications_stage_created', 'applications', ['stage', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_applications_stage_created', table_name='applications')
    op.drop_index(op.f('ix_applications_stage'), table_name='applications')
    op.drop_index(op.f('ix_applications_ref'), table_name='applications')
    op.drop_table('applications')
    op.execute("DROP TYPE IF EXISTS application_stage")
    op.execute("DROP SEQUENCE IF EXISTS application_ref_seq")
