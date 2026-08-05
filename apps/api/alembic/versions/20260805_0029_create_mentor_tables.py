"""create mentor_sessions and mentor_messages tables

Revision ID: 20260805_0029
Revises: 20260804_0028
Create Date: 2026-08-05

新的「AI 心靈導師」功能——跟其他一次性分析功能不一樣，這是多輪對話，
所以拆兩張表：mentor_sessions 存整段對話的狀態（有沒有收斂、收斂後的
分析結果），mentor_messages 存逐句對話紀錄，一個 session 底下有多筆
message。
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260805_0029"
down_revision: Union[str, None] = "20260804_0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mentor_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pet_id",
            sa.Integer(),
            sa.ForeignKey("pets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "is_finished", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("summary_sections", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_mentor_sessions_user_id", "mentor_sessions", ["user_id"]
    )
    op.create_index(
        "ix_mentor_sessions_pet_id", "mentor_sessions", ["pet_id"]
    )

    op.create_table(
        "mentor_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("mentor_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_mentor_messages_session_id", "mentor_messages", ["session_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_mentor_messages_session_id", table_name="mentor_messages")
    op.drop_table("mentor_messages")
    op.drop_index("ix_mentor_sessions_pet_id", table_name="mentor_sessions")
    op.drop_index("ix_mentor_sessions_user_id", table_name="mentor_sessions")
    op.drop_table("mentor_sessions")
