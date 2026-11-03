"""cms blog taxonomy: authors, categories, post SEO + FK fields.

Additive-only expansion (expand-then-contract): existing cms_posts text
columns (author/category) are kept and stay populated via denormalization;
a later cleanup migration may contract them.

Revision ID: a7f3e2c91d05
Revises: 9914e7062d67
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "a7f3e2c91d05"
down_revision: str | None = "9914e7062d67"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cms_authors",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=150), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_media_id", sa.UUID(), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("linkedin_url", sa.String(length=500), nullable=True),
        sa.Column("instagram_url", sa.String(length=500), nullable=True),
        sa.Column("twitter_url", sa.String(length=500), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("created_by_id", sa.UUID(), nullable=True),
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["avatar_media_id"], ["cms_media.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cms_authors_slug"), "cms_authors", ["slug"], unique=True)
    op.create_table(
        "cms_categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["cms_categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cms_categories_slug"), "cms_categories", ["slug"], unique=True)
    op.create_index("ix_cms_categories_parent_id", "cms_categories", ["parent_id"], unique=False)

    op.add_column("cms_posts", sa.Column("author_id", sa.UUID(), nullable=True))
    op.add_column("cms_posts", sa.Column("category_id", sa.UUID(), nullable=True))
    op.add_column("cms_posts", sa.Column("subcategory_id", sa.UUID(), nullable=True))
    op.add_column("cms_posts", sa.Column("subcategory", sa.String(length=100), nullable=True))
    op.add_column("cms_posts", sa.Column("meta_title", sa.String(length=300), nullable=True))
    op.add_column("cms_posts", sa.Column("meta_description", sa.String(length=500), nullable=True))
    op.create_foreign_key(
        "fk_cms_posts_author_id", "cms_posts", "cms_authors", ["author_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_cms_posts_category_id", "cms_posts", "cms_categories", ["category_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_cms_posts_subcategory_id", "cms_posts", "cms_categories", ["subcategory_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_cms_posts_author_id", "cms_posts", ["author_id"], unique=False)
    op.create_index("ix_cms_posts_subcategory_id", "cms_posts", ["subcategory_id"], unique=False)
    op.create_index(
        "ix_cms_posts_category_published",
        "cms_posts",
        ["category_id", "status", "published_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_cms_posts_category_published", table_name="cms_posts")
    op.drop_index("ix_cms_posts_subcategory_id", table_name="cms_posts")
    op.drop_index("ix_cms_posts_author_id", table_name="cms_posts")
    op.drop_constraint("fk_cms_posts_subcategory_id", "cms_posts", type_="foreignkey")
    op.drop_constraint("fk_cms_posts_category_id", "cms_posts", type_="foreignkey")
    op.drop_constraint("fk_cms_posts_author_id", "cms_posts", type_="foreignkey")
    op.drop_column("cms_posts", "meta_description")
    op.drop_column("cms_posts", "meta_title")
    op.drop_column("cms_posts", "subcategory")
    op.drop_column("cms_posts", "subcategory_id")
    op.drop_column("cms_posts", "category_id")
    op.drop_column("cms_posts", "author_id")
    op.drop_index("ix_cms_categories_parent_id", table_name="cms_categories")
    op.drop_index(op.f("ix_cms_categories_slug"), table_name="cms_categories")
    op.drop_table("cms_categories")
    op.drop_index(op.f("ix_cms_authors_slug"), table_name="cms_authors")
    op.drop_table("cms_authors")
