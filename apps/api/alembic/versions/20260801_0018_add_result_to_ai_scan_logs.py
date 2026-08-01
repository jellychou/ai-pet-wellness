"""add analysis result columns to ai_scan_logs

Revision ID: 20260801_0018
Revises: 20260801_0017
Create Date: 2026-08-01

ai_scan_logs 原本只是拿來算「今天打了幾次」的計數器，現在要加上「檢視記錄」
功能，同一張表順便存分析結果本身（照片網址、摘要、findings），不用另外
開一張歷史紀錄表。

image_url / summary 補的是舊資料沒有的欄位，先用 nullable=True 建欄位、
把既有資料填上預設值，最後再收成 nullable=False，避免舊資料因為補欄位而炸掉
（跟之前 pets/report_records 加欄位的作法一致）。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260801_0018"
down_revision: Union[str, None] = "20260801_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_scan_logs", sa.Column("image_url", sa.Text(), nullable=True)
    )
    op.add_column(
        "ai_scan_logs", sa.Column("summary", sa.Text(), nullable=True)
    )
    op.add_column(
        "ai_scan_logs",
        sa.Column("findings", postgresql.JSONB(), nullable=True),
    )

    # 舊資料（如果有的話）沒有分析結果可以回填，給空字串當預設值，
    # 之後在畫面上就顯示成「沒有紀錄內容」
    op.execute(
        "UPDATE ai_scan_logs SET image_url = '' WHERE image_url IS NULL"
    )
    op.execute("UPDATE ai_scan_logs SET summary = '' WHERE summary IS NULL")

    op.alter_column("ai_scan_logs", "image_url", nullable=False)
    op.alter_column("ai_scan_logs", "summary", nullable=False)


def downgrade() -> None:
    op.drop_column("ai_scan_logs", "findings")
    op.drop_column("ai_scan_logs", "summary")
    op.drop_column("ai_scan_logs", "image_url")
