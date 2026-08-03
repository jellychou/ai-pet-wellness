"""add user_note to food_scan_logs

Revision ID: 20260803_0027
Revises: 20260803_0026
Create Date: 2026-08-03

食物辨識室的流程改成跟症狀診斷室（ai_scan）一樣：先上傳照片、使用者可以
補充一段說明，再按「開始分析」才真的打 AI。這裡補上對應的 user_note
欄位，讓補充說明也能存進紀錄、「檢視記錄」列表看得到。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260803_0027"
down_revision: Union[str, None] = "20260803_0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "food_scan_logs", sa.Column("user_note", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("food_scan_logs", "user_note")
