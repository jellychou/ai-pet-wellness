"""add language, gender, login_method, is_set_password

Revision ID: 20260730_0007
Revises: 20260730_0006
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260730_0007"
down_revision: Union[str, None] = "fe3fb564937a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("language", sa.String(length=10), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column(
        "users", sa.Column("login_method", sa.String(length=20), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "is_set_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )

    # 舊資料：帳密登入的（有 password_hash 但沒 google_sub）標成 password，
    # 純 Google 登入的（有 google_sub 但沒設過真密碼）標成 google
    op.execute(
        "UPDATE users SET login_method = 'google' WHERE google_sub IS NOT NULL"
    )
    op.execute(
        "UPDATE users SET login_method = 'password' WHERE login_method IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "is_set_password")
    op.drop_column("users", "login_method")
    op.drop_column("users", "gender")
    op.drop_column("users", "language")
