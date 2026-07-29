"""add password reset token fields

Revision ID: 20260729_0005
Revises: 20260729_0004
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260729_0005"
down_revision: Union[str, None] = "20260729_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("reset_token_hash", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("reset_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "reset_token_expires_at")
    op.drop_column("users", "reset_token_hash")
