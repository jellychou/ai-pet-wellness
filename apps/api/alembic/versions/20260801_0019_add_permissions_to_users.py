"""add permissions column to users

Revision ID: 20260801_0019
Revises: 20260801_0018
Create Date: 2026-08-01

"user"（一般使用者）或 "admin"（管理員）。目前唯一的用途是 AI 拍照
診斷的每日次數限制：admin 不受限。用 server_default 讓既有的使用者
一律先算成 "user"，不用另外分兩步（加 nullable 欄位 -> 回填 -> 收成
NOT NULL），字串預設值可以一次到位。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260801_0019"
down_revision: Union[str, None] = "20260801_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "permissions",
            sa.String(length=255),
            nullable=False,
            server_default="user",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "permissions")
