"""rename users.birthdate to users.birthday

Revision ID: 20260730_0008
Revises: 20260730_0007
Create Date: 2026-07-30

程式碼（model/schema）在這次改動之前已經把欄位名稱從 birthdate 改成 birthday，
但正式環境（Render 上的 Neon）的 users table 是用舊的 migration 0004 建的，
欄位還是叫 birthdate，導致 ORM 查詢時噴 psycopg2.errors.UndefinedColumn:
column users.birthday does not exist（HINT 直接建議 users.birthdate）。
這裡補一支 rename migration，把實際的資料庫欄位改名對齊現在的程式碼。
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260730_0008"
down_revision: Union[str, None] = "20260730_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "birthdate", new_column_name="birthday")


def downgrade() -> None:
    op.alter_column("users", "birthday", new_column_name="birthdate")
