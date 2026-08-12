"""make report_temperature/report_heart_rate optional

Revision ID: 20260812_0032
Revises: 20260806_0031
Create Date: 2026-08-12

在家記錄健檢時不一定量得到體溫/心跳（需要體溫計/聽診器），不該卡住整筆
健檢紀錄無法送出，所以這兩欄跟 report_note/report_files 一樣改成 nullable。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260812_0032"
down_revision: Union[str, None] = "20260806_0031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "report_records", "report_temperature", existing_type=sa.Float(), nullable=True
    )
    op.alter_column(
        "report_records", "report_heart_rate", existing_type=sa.Integer(), nullable=True
    )


def downgrade() -> None:
    # 降級回必填前，既有的 NULL 值沒有合理的預設數字可以回填（體溫/心跳因
    # 寵物而異，瞎填一個數字比留著錯誤訊息更誤導），所以直接改回 NOT NULL——
    # 如果那之前已經有 NULL 資料，這一步在下降級時會失敗，是預期中的行為
    op.alter_column(
        "report_records", "report_temperature", existing_type=sa.Float(), nullable=False
    )
    op.alter_column(
        "report_records", "report_heart_rate", existing_type=sa.Integer(), nullable=False
    )
