"""create food_records table

Revision ID: 20260801_0021
Revises: 20260801_0020
Create Date: 2026-08-01

「加入飲食記錄」表單送出後存進來的一筆飲食紀錄。跟 food_scan_logs 是
不同概念：food_scan_logs 是「AI 辨識了這張照片一次」的紀錄（calories
存的是每 100g 密度），food_records 是「這隻寵物在某個時間點吃了多少」
的飲食日記（calories 存的是這次份量的總熱量，前端算好 calories_per_100g
* portion_grams / 100 之後才送過來）。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260801_0021"
down_revision: Union[str, None] = "20260801_0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("food_name", sa.String(length=255), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("portion_grams", sa.Float(), nullable=False),
        sa.Column("calories", sa.Float(), nullable=False),
        sa.Column("meal_type", sa.String(length=20), nullable=False),
        sa.Column("fed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_food_records_pet_id", "food_records", ["pet_id"])


def downgrade() -> None:
    op.drop_index("ix_food_records_pet_id", table_name="food_records")
    op.drop_table("food_records")
