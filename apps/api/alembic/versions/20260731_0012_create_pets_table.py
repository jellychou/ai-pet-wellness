"""create pets table, migrate data out of users.pets jsonb

Revision ID: 20260731_0012
Revises: 20260731_0011
Create Date: 2026-07-31

寵物資料原本放在 users.pets 這個 JSONB 陣列裡，改成獨立的 pets table，
user_id 用真正的 FK 指向 users.id。原因：JSONB 版本每次改寵物都要整包
重新賦值才會被 SQLAlchemy 追蹤到、無法用資料庫層的查詢/約束，之後要接
飲食紀錄等其他表時，pet_id 也只能是沒有 FK 保護的裸 int，坑會一直複製。

這支 migration 會把 users.pets 裡既有的資料搬進新的 pets table，同時把
users.active_pet_id（原本存的是 JSONB 陣列裡手動配的 id）重新對應成新
table 的真正主鍵，最後幫 active_pet_id 補上指向 pets.id 的 FK。
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import column, table
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "20260731_0012"
down_revision: Union[str, None] = "20260731_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pets_table():
    return table(
        "pets",
        column("id", sa.Integer),
        column("user_id", sa.Integer),
        column("name", sa.String),
        column("breed", sa.String),
        column("gender", sa.String),
        column("birthday", sa.Date),
        column("weight", sa.Float),
        column("coatColor", sa.String),
        column("neutered", sa.String),
        column("allergy", sa.Text),
        column("activity", sa.String),
        column("chipNumber", sa.String),
        column("note", sa.Text),
        column("avatar", sa.Text),
        column("is_active", sa.Boolean),
    )


def _users_table():
    return table(
        "users",
        column("id", sa.Integer),
        column("pets", JSONB),
        column("active_pet_id", sa.Integer),
    )


def upgrade() -> None:
    op.create_table(
        "pets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("breed", sa.String(length=100), nullable=False),
        sa.Column("gender", sa.String(length=20), nullable=False),
        sa.Column("birthday", sa.Date(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("coatColor", sa.String(length=50), nullable=False),
        sa.Column("neutered", sa.String(length=10), nullable=False),
        sa.Column("allergy", sa.Text(), nullable=False, server_default=""),
        sa.Column("activity", sa.String(length=50), nullable=False),
        sa.Column("chipNumber", sa.String(length=100), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        # 可能是 base64 圖片字串，跟 users.picture_url 一樣要用 Text，
        # 不能用有長度上限的 String（之前 picture_url 就因為這樣炸過一次）
        sa.Column("avatar", sa.Text(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )
    op.create_index("ix_pets_user_id", "pets", ["user_id"])

    # --- 把 users.pets 陣列裡既有的資料搬進新的 pets table ---
    # 舊資料的 id 是 Python 端手動配的（max+1），跟新 table 的 serial 主鍵不會
    # 一樣，搬的同時要記住「舊 id -> 新 id」的對照，才能把 users.active_pet_id
    # 一起改成指向新的主鍵
    connection = op.get_bind()
    users_table = _users_table()
    pets_table = _pets_table()

    rows = connection.execute(
        sa.select(users_table.c.id, users_table.c.pets, users_table.c.active_pet_id)
    ).fetchall()

    for user_id, pets_json, active_pet_id in rows:
        if not pets_json:
            continue

        old_to_new_id: dict[int, int] = {}
        for pet in pets_json:
            result = connection.execute(
                pets_table.insert().values(
                    user_id=user_id,
                    name=pet.get("name") or "",
                    breed=pet.get("breed") or "",
                    gender=pet.get("gender") or "",
                    birthday=pet.get("birthday"),
                    weight=pet.get("weight") or 0,
                    coatColor=pet.get("coatColor") or "",
                    neutered=pet.get("neutered") or "",
                    allergy=pet.get("allergy") or "",
                    activity=pet.get("activity") or "",
                    chipNumber=pet.get("chipNumber"),
                    note=pet.get("note"),
                    avatar=pet.get("avatar"),
                    is_active=bool(pet.get("is_active", False)),
                )
            )
            new_id = result.inserted_primary_key[0]
            old_id = pet.get("id")
            if old_id is not None:
                old_to_new_id[old_id] = new_id

        if active_pet_id is not None:
            connection.execute(
                users_table.update()
                .where(users_table.c.id == user_id)
                .values(active_pet_id=old_to_new_id.get(active_pet_id))
            )
        else:
            connection.execute(
                users_table.update()
                .where(users_table.c.id == user_id)
                .values(active_pet_id=None)
            )

    # active_pet_id 現在存的是真正的 pets.id 了，補上 FK 約束。
    # ON DELETE SET NULL：刪除寵物的時候不用另外處理 users.active_pet_id，
    # 資料庫會自動把它設回 NULL（app/routers/pet.py 的刪除邏輯就不用自己來）
    op.create_foreign_key(
        "fk_users_active_pet_id_pets",
        "users",
        "pets",
        ["active_pet_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.drop_column("users", "pets")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("pets", JSONB, nullable=False, server_default="[]"),
    )

    connection = op.get_bind()
    users_table = _users_table()
    pets_table = _pets_table()

    rows = connection.execute(
        sa.select(
            pets_table.c.id,
            pets_table.c.user_id,
            pets_table.c.name,
            pets_table.c.breed,
            pets_table.c.gender,
            pets_table.c.birthday,
            pets_table.c.weight,
            pets_table.c.coatColor,
            pets_table.c.neutered,
            pets_table.c.allergy,
            pets_table.c.activity,
            pets_table.c.chipNumber,
            pets_table.c.note,
            pets_table.c.avatar,
            pets_table.c.is_active,
        )
    ).fetchall()

    pets_by_user: dict[int, list[dict]] = {}
    for row in rows:
        pets_by_user.setdefault(row.user_id, []).append(
            {
                "id": row.id,
                "name": row.name,
                "breed": row.breed,
                "gender": row.gender,
                "birthday": row.birthday.isoformat() if row.birthday else None,
                "weight": row.weight,
                "coatColor": row.coatColor,
                "neutered": row.neutered,
                "allergy": row.allergy,
                "activity": row.activity,
                "chipNumber": row.chipNumber,
                "note": row.note,
                "avatar": row.avatar,
                "is_active": row.is_active,
            }
        )

    for user_id, pets_list in pets_by_user.items():
        connection.execute(
            users_table.update()
            .where(users_table.c.id == user_id)
            .values(pets=pets_list)
        )

    op.drop_constraint("fk_users_active_pet_id_pets", "users", type_="foreignkey")
    op.drop_table("pets")
