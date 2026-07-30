"""add users.pets jsonb array

Revision ID: 20260730_0010
Revises: 20260730_0009
Create Date: 2026-07-30

每個使用者底下的寵物先用一個 JSONB 陣列存在 users.pets（不開獨立的 pets table），
陣列裡每個元素是一隻寵物的資料。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "20260730_0010"
down_revision: Union[str, None] = "20260730_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "pets",
            JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "pets")
