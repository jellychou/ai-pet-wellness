"""add itemized breakdown to food_scan_logs

Revision ID: 20260801_0023
Revises: 20260801_0022
Create Date: 2026-08-01

食物辨識從「整張照片一個食物」改成逐項食材/品項分解（干貝、蟹肉、燉飯...
各自估重量範圍與熱量範圍），比較接近使用者實際想要的分析深度。加四個
欄位：items（JSONB 陣列）、calories_low/calories_high（總熱量估計範圍）、
estimate_note（估算準確度說明）。既有的 calories/estimated_grams 等欄位
語意不變，繼續當作「單一最佳估計」，跟新的範圍欄位互補。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260801_0023"
down_revision: Union[str, None] = "20260801_0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "food_scan_logs",
        sa.Column("items", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "food_scan_logs",
        sa.Column("calories_low", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "food_scan_logs",
        sa.Column("calories_high", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column(
        "food_scan_logs",
        sa.Column("estimate_note", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("food_scan_logs", "estimate_note")
    op.drop_column("food_scan_logs", "calories_high")
    op.drop_column("food_scan_logs", "calories_low")
    op.drop_column("food_scan_logs", "items")
