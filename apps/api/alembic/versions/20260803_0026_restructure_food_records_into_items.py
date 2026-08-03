"""restructure food_records into food_records (meal group) + food_record_items

Revision ID: 20260803_0026
Revises: 20260802_0025
Create Date: 2026-08-03

原本一筆 food_records 只能存一個食材，跟「多食材混合記錄」的新規劃
（一餐可以混合多個 AI 辨識或歷史選擇的食材）不對等，所以拆成兩張表：
food_records 變成「這一餐」的共同屬性（meal_type/fed_at/note/
total_calories 加總），food_record_items 存底下每一項食材各自的
food_name/image_url/portion_grams/calories。既有資料用一筆
food_records = 一筆 food_record_items 的方式搬過去，不會遺失。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260803_0026"
down_revision: Union[str, None] = "20260802_0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "food_record_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "food_record_id",
            sa.Integer(),
            sa.ForeignKey("food_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("food_name", sa.String(length=255), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("portion_grams", sa.Float(), nullable=False),
        sa.Column("calories", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_food_record_items_food_record_id",
        "food_record_items",
        ["food_record_id"],
    )

    op.add_column(
        "food_records",
        sa.Column("total_calories", sa.Float(), nullable=False, server_default="0"),
    )

    # 把既有的「一筆記錄=一個食材」資料搬成對應的一筆 food_record_items，
    # 並把加總值填進新的 total_calories（既有資料本來就只有一項，加總
    # 就是它自己的 calories）
    op.execute(
        """
        INSERT INTO food_record_items
            (food_record_id, food_name, image_url, portion_grams, calories, created_at)
        SELECT id, food_name, image_url, portion_grams, calories, created_at
        FROM food_records
        """
    )
    op.execute("UPDATE food_records SET total_calories = calories")

    op.drop_column("food_records", "food_name")
    op.drop_column("food_records", "image_url")
    op.drop_column("food_records", "portion_grams")
    op.drop_column("food_records", "calories")


def downgrade() -> None:
    op.add_column(
        "food_records", sa.Column("food_name", sa.String(length=255), nullable=True)
    )
    op.add_column("food_records", sa.Column("image_url", sa.Text(), nullable=True))
    op.add_column(
        "food_records", sa.Column("portion_grams", sa.Float(), nullable=True)
    )
    op.add_column("food_records", sa.Column("calories", sa.Float(), nullable=True))

    # 還原時每筆 food_records 只能保留一個食材——取每個 food_record_id
    # 底下最早新增的那一項（跟原始單品項資料最接近），多食材的部分會遺失，
    # 這是還原到舊結構本來就無法避免的損失
    op.execute(
        """
        UPDATE food_records fr
        SET food_name = fri.food_name,
            image_url = fri.image_url,
            portion_grams = fri.portion_grams,
            calories = fri.calories
        FROM (
            SELECT DISTINCT ON (food_record_id)
                food_record_id, food_name, image_url, portion_grams, calories
            FROM food_record_items
            ORDER BY food_record_id, id
        ) fri
        WHERE fr.id = fri.food_record_id
        """
    )

    op.alter_column("food_records", "food_name", nullable=False)
    op.alter_column("food_records", "portion_grams", nullable=False)
    op.alter_column("food_records", "calories", nullable=False)

    op.drop_column("food_records", "total_calories")
    op.drop_index("ix_food_record_items_food_record_id", table_name="food_record_items")
    op.drop_table("food_record_items")
