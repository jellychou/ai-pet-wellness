"""add body_part, user_note, added_to_timeline to ai_scan_logs

Revision ID: 20260802_0025
Revises: 20260801_0024
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260802_0025"
down_revision: Union[str, None] = "20260801_0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_scan_logs", sa.Column("body_part", sa.Text(), nullable=True)
    )
    op.add_column(
        "ai_scan_logs", sa.Column("user_note", sa.Text(), nullable=True)
    )
    op.add_column(
        "ai_scan_logs",
        sa.Column(
            "added_to_timeline",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_scan_logs", "added_to_timeline")
    op.drop_column("ai_scan_logs", "user_note")
    op.drop_column("ai_scan_logs", "body_part")
