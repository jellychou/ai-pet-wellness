"""create health_journal_logs table

Revision ID: 20260804_0028
Revises: 20260803_0027
Create Date: 2026-08-04

新的「AI 健康日誌」功能——跟 ai_scan_logs 是同一套設計理由：每打一次成功
的分析就記一筆，同一張表兼「今日用量計數器」跟「檢視記錄」的資料來源。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260804_0028"
down_revision: Union[str, None] = "20260803_0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_journal_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("appetite", sa.String(length=10), nullable=False),
        sa.Column("energy", sa.String(length=10), nullable=False),
        sa.Column("activity_level", sa.String(length=10), nullable=False),
        sa.Column("bowel_movement", sa.String(length=10), nullable=False),
        sa.Column("vomiting", sa.String(length=10), nullable=False),
        sa.Column(
            "other_symptoms",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("diary_text", sa.Text(), nullable=True),
        sa.Column(
            "photo_urls", postgresql.JSONB(), nullable=False, server_default="[]"
        ),
        sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column(
            "health_score", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "risk_level", sa.String(length=10), nullable=False, server_default=""
        ),
        sa.Column(
            "summary_points",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "recommendations",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "added_to_timeline",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_health_journal_logs_user_id", "health_journal_logs", ["user_id"]
    )
    op.create_index(
        "ix_health_journal_logs_pet_id", "health_journal_logs", ["pet_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_health_journal_logs_pet_id", table_name="health_journal_logs")
    op.drop_index("ix_health_journal_logs_user_id", table_name="health_journal_logs")
    op.drop_table("health_journal_logs")
