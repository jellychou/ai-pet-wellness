"""add users.active_pet_id

Revision ID: 20260731_0011
Revises: 20260730_0010
Create Date: 2026-07-31

紀錄使用者目前選中的寵物 id（對應 users.pets 陣列裡某個元素的 id），
用於 UI 上顯示/操作該寵物。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260731_0011"
down_revision: Union[str, None] = "20260730_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("active_pet_id", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "active_pet_id")
