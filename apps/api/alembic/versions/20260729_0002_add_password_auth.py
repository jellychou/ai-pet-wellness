"""add password auth support

Revision ID: 20260729_0002
Revises: 20260729_0001
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260729_0002"
down_revision: Union[str, None] = "20260729_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("password_hash", sa.String(length=255), nullable=True)
    )
    # 帳密註冊的使用者沒有 google_sub，所以這欄改成可以是 null
    op.alter_column(
        "users", "google_sub", existing_type=sa.String(length=255), nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        "users", "google_sub", existing_type=sa.String(length=255), nullable=False
    )
    op.drop_column("users", "password_hash")
