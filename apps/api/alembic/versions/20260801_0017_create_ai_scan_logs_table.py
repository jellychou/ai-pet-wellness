"""create ai_scan_logs table

Revision ID: 20260801_0017
Revises: 20260801_0016
Create Date: 2026-08-01

用來算「這個使用者今天已經打了幾次 AI 圖片分析」的紀錄表，每呼叫一次
OpenAI 成功就寫一筆，不存分析結果本身。查詢用 user_id + created_at 算
今天的次數，開一個複合索引比較有效率。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260801_0017"
down_revision: Union[str, None] = "20260801_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_scan_logs",
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
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_ai_scan_logs_user_id", "ai_scan_logs", ["user_id"]
    )
    op.create_index(
        "ix_ai_scan_logs_pet_id", "ai_scan_logs", ["pet_id"]
    )
    op.create_index(
        "ix_ai_scan_logs_user_id_created_at",
        "ai_scan_logs",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ai_scan_logs_user_id_created_at", table_name="ai_scan_logs"
    )
    op.drop_index("ix_ai_scan_logs_pet_id", table_name="ai_scan_logs")
    op.drop_index("ix_ai_scan_logs_user_id", table_name="ai_scan_logs")
    op.drop_table("ai_scan_logs")
