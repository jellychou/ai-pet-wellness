"""add estimated_grams to food_scan_logs

Revision ID: 20260801_0022
Revises: 20260801_0021
Create Date: 2026-08-01

食物辨識改成直接請 AI 估計照片中「這一份」食物的總重量（公克），不再是
每 100g 的密度——使用者身邊通常沒有秤，沒辦法先秤重再回報。calories/
protein/fat/carb/fiber 這些既有欄位不用改型別，只是語意從「每 100g」
變成「對應 estimated_grams 的這一份總量」，見 app/routers/food_scan.py
的 SYSTEM_PROMPT。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260801_0022"
down_revision: Union[str, None] = "20260801_0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "food_scan_logs",
        sa.Column(
            "estimated_grams",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("food_scan_logs", "estimated_grams")
