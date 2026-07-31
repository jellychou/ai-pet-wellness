"""support pending (待接種) vaccine records

Revision ID: 20260731_0015
Revises: 20260731_0014
Create Date: 2026-07-31

「新增待接種疫苗」是還沒真的打的疫苗計畫（例如幼犬還沒去打的第二劑），跟
「新增疫苗紀錄」（已經打過、補記錄）共用同一張 vaccine_records 表，
用 vaccination_date 是不是 null 分辨兩種：null 代表待接種、有值代表已接種。

因為待接種的當下還沒有施打日期/地點/醫院這些資訊，這裡把 vaccination_date、
location 改成可以是 null；另外加三個待接種流程才會用到的欄位：
dose_count（預計施打劑次）、recurring_enabled/recurring_interval（週期性提醒）。

同時把 location 的 server_default 拿掉——SQLAlchemy 對「欄位有 server_default
時 Python 端明確設成 None」的處理方式是讓 server_default 蓋過去、不會真的存成
NULL，待接種疫苗的 location 就會被誤存成 "hospital"，之後要不要預設值交給
Pydantic schema 層處理就好。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260731_0015"
down_revision: Union[str, None] = "20260731_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "vaccine_records",
        "vaccination_date",
        existing_type=sa.Date(),
        nullable=True,
    )
    op.alter_column(
        "vaccine_records",
        "location",
        existing_type=sa.String(length=20),
        nullable=True,
        server_default=None,
    )
    op.add_column(
        "vaccine_records", sa.Column("dose_count", sa.String(length=10), nullable=True)
    )
    op.add_column(
        "vaccine_records",
        sa.Column(
            "recurring_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "vaccine_records",
        sa.Column("recurring_interval", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vaccine_records", "recurring_interval")
    op.drop_column("vaccine_records", "recurring_enabled")
    op.drop_column("vaccine_records", "dose_count")
    op.alter_column(
        "vaccine_records",
        "location",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="hospital",
    )
    op.alter_column(
        "vaccine_records",
        "vaccination_date",
        existing_type=sa.Date(),
        nullable=False,
    )
