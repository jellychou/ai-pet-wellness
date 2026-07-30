"""add profile fields (phone, birthday, slogan)

Revision ID: 20260729_0004
Revises: 20260729_0003
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260729_0004"
down_revision: Union[str, None] = "20260729_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("birthday", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("slogan", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "slogan")
    op.drop_column("users", "birthday")
    op.drop_column("users", "phone")
