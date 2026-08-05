"""add water to food_scan_logs

Revision ID: 20260806_0031
Revises: 20260805_0030
Create Date: 2026-08-06

AI 食物辨識現在也順便估算「這份餐點本身含多少水分」（例如濕食罐頭、湯泡飯），
單位毫升，跟寵物自己喝水的 water_records（另一張表，追蹤的是喝水量，不是
食物含水量）是兩件不同的事，不要搞混。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260806_0031"
down_revision: Union[str, None] = "20260805_0030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "food_scan_logs",
        sa.Column(
            "water", sa.Float(), nullable=False, server_default="0"
        ),
    )


def downgrade() -> None:
    op.drop_column("food_scan_logs", "water")
