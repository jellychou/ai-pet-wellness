"""create water_records table

Revision ID: 20260805_0030
Revises: 20260805_0029
Create Date: 2026-08-05

新的「飲水量」追蹤功能——跟 food_records 同樣的「單筆事件」設計：每記一次
飲水量就存一筆，不是一天一筆累加更新，Dashboard 的「今日飲水量」用 sum
即時算出來。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260805_0030"
down_revision: Union[str, None] = "20260805_0029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "water_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount_ml", sa.Integer(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_water_records_pet_id", "water_records", ["pet_id"])


def downgrade() -> None:
    op.drop_index("ix_water_records_pet_id", table_name="water_records")
    op.drop_table("water_records")
