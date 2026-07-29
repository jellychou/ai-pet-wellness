"""drop google login support

Revision ID: 20260729_0003
Revises: 20260729_0002
Create Date: 2026-07-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260729_0003"
down_revision: Union[str, None] = "20260729_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 拿掉 Google 登入後，純 Google 登入（沒有密碼）的帳號沒辦法再登入了，
    # 開發環境直接清掉；如果之後有真實使用者資料，這步要換成手動遷移密碼或通知使用者重設
    op.execute("DELETE FROM users WHERE password_hash IS NULL")

    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "google_sub")

    op.alter_column(
        "users", "password_hash", existing_type=sa.String(length=255), nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        "users", "password_hash", existing_type=sa.String(length=255), nullable=True
    )
    op.add_column(
        "users", sa.Column("google_sub", sa.String(length=255), nullable=True)
    )
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
