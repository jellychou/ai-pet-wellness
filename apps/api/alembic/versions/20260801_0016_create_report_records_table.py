"""create report_records table

Revision ID: 20260801_0016
Revises: 20260731_0015
Create Date: 2026-08-01

健康檢查報告是「一隻寵物、很多筆」的歷史資料（每次回診/健檢都是新的一筆），
用 pet_id 當 FK 開一張獨立的表，跟 vaccine_records 是同樣的設計理由。

report_note / report_files 是選填欄位，DB 允許 null，對應的 Pydantic schema
（app/schemas/report.py）也要是 Optional，不然遇到 NULL 值回傳序列化會炸。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260801_0016"
down_revision: Union[str, None] = "20260731_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("report_type", sa.String(length=100), nullable=False),
        sa.Column("report_result", sa.String(length=100), nullable=False),
        sa.Column("report_weight", sa.Float(), nullable=False),
        sa.Column("report_temperature", sa.Float(), nullable=False),
        sa.Column("report_heart_rate", sa.Integer(), nullable=False),
        sa.Column("report_hospital", sa.String(length=100), nullable=False),
        sa.Column("report_vet", sa.String(length=100), nullable=False),
        sa.Column("report_note", sa.Text(), nullable=True),
        sa.Column("report_files", postgresql.JSONB(), nullable=True),
    )
    op.create_index(
        "ix_report_records_pet_id", "report_records", ["pet_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_report_records_pet_id", table_name="report_records")
    op.drop_table("report_records")
