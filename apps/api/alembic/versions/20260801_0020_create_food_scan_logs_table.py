"""create food_scan_logs table

Revision ID: 20260801_0020
Revises: 20260801_0019
Create Date: 2026-08-01

AI 食物辨別功能的紀錄表，跟 ai_scan_logs（寵物症狀辨識）是各自獨立的
一張表——欄位形狀完全不同（這裡存的是營養資訊/安全性，不是 findings），
每日額度也是分開算的（見 app/routers/food_scan.py 的 DAILY_LIMIT）。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260801_0020"
down_revision: Union[str, None] = "20260801_0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_scan_logs",
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
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column(
            "food_detected", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("food_name", sa.String(length=255), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("protein", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fat", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carb", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fiber", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "safety_level", sa.Integer(), nullable=False, server_default="3"
        ),
        sa.Column(
            "is_safe", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column(
            "suitable_species",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "suggestions", postgresql.JSONB(), nullable=False, server_default="[]"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_food_scan_logs_user_id", "food_scan_logs", ["user_id"]
    )
    op.create_index("ix_food_scan_logs_pet_id", "food_scan_logs", ["pet_id"])


def downgrade() -> None:
    op.drop_index("ix_food_scan_logs_pet_id", table_name="food_scan_logs")
    op.drop_index("ix_food_scan_logs_user_id", table_name="food_scan_logs")
    op.drop_table("food_scan_logs")
