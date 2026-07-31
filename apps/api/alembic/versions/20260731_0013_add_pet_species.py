"""add pets.species

Revision ID: 20260731_0013
Revises: 20260731_0012
Create Date: 2026-07-31

寵物加上「物種」欄位（"dog" / "cat"），之後要算蛋白質/脂肪/碳水的建議量時，
狗跟貓的比例需求差很多（貓是肉食動物，蛋白質需求比狗高很多），需要靠這個
欄位分開套不同比例，不能只靠 breed 這個自由輸入的字串去猜。

既有資料庫欄位加 nullable=False 一定要搭配 server_default，不然舊資料
沒有這欄位、migration 會直接失敗；預設抓 "dog" 是因為目前的假資料/預設
大頭照都是狗，之後這個 app 主要族群應該也是養狗的人比較多。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260731_0013"
down_revision: Union[str, None] = "20260731_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pets",
        sa.Column(
            "species", sa.String(length=10), nullable=False, server_default="dog"
        ),
    )


def downgrade() -> None:
    op.drop_column("pets", "species")
