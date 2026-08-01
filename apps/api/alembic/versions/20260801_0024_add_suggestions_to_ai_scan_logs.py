"""add suggestions to ai_scan_logs

Revision ID: 20260801_0024
Revises: 20260801_0023
Create Date: 2026-08-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260801_0024"
down_revision: Union[str, None] = "20260801_0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_scan_logs",
        sa.Column("suggestions", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ai_scan_logs", "suggestions")
