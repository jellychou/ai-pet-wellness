"""create vaccine_records table

Revision ID: 20260731_0014
Revises: 20260731_0013
Create Date: 2026-07-31

疫苗紀錄是「一隻寵物、很多筆」的歷史資料——同一種疫苗每年都要重打、不同
疫苗類型各自有自己的下次到期日，沒辦法塞進 pets 表的固定欄位（會遇到跟
之前 users.pets JSONB 一樣的問題：查詢/索引都不方便，也沒有 FK 完整性）。
所以另外開一張 vaccine_records 表，用 pet_id 當 FK，讓一隻寵物可以有
無限筆疫苗歷史。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260731_0014"
down_revision: Union[str, None] = "20260731_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vaccine_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("vaccine_type", sa.String(length=100), nullable=False),
        sa.Column("vaccine_name", sa.String(length=100), nullable=False),
        sa.Column("batch_number", sa.String(length=100), nullable=True),
        sa.Column("vaccination_date", sa.Date(), nullable=False),
        sa.Column(
            "location",
            sa.String(length=20),
            nullable=False,
            server_default="hospital",
        ),
        sa.Column("hospital", sa.String(length=100), nullable=True),
        sa.Column("vet", sa.String(length=100), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "reminder_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column("next_date", sa.Date(), nullable=True),
        sa.Column("reminder_lead_days", sa.Integer(), nullable=True),
        sa.Column("next_note", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_vaccine_records_pet_id", "vaccine_records", ["pet_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_vaccine_records_pet_id", table_name="vaccine_records")
    op.drop_table("vaccine_records")
