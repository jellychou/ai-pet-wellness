"""widen users.picture_url from varchar(1024) to text

Revision ID: 20260730_0009
Revises: 20260730_0008
Create Date: 2026-07-30

頭貼改成直接存 base64 data URL（不再用瀏覽器本地的 blob: URL，那種 URL 重新整理頁面
或換裝置就讀不到），base64 字串通常遠超過 1024 字，把欄位改成不限長度的 TEXT。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260730_0009"
down_revision: Union[str, None] = "20260730_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "picture_url",
        existing_type=sa.String(length=1024),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "picture_url",
        existing_type=sa.Text(),
        type_=sa.String(length=1024),
        existing_nullable=True,
    )
