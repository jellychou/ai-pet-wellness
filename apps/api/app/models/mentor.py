from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.user import User


# AI 心靈導師是多輪對話，跟其他一次性分析功能（ai_scan/food_scan/
# health_journal）不一樣，所以拆成兩張表：MentorSession 存「整段對話」的
# 狀態（有沒有收斂、收斂後的分析結果），MentorMessage 存「逐句」的對話
# 紀錄，一個 session 底下有多筆 message——後端每一輪呼叫 OpenAI 之前，
# 都要把同一個 session 底下全部 message 依時間排序組回歷史
class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 對話有沒有收斂到「AI 已經給出分析結果」——一旦是 True，這個 session
    # 就不能再繼續發訊息，前端要開一段新的對話（見 routers/mentor.py）
    is_finished: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # 收斂之後的重點摘要（對應 MentorResponse.summary_sections），
    # 沒收斂之前是 None
    summary_sections: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # 每次這個 session 底下新增訊息/收斂時都會更新，onupdate 是必須的，
    # 不然這欄位會永遠等於 created_at
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User")
    pet: Mapped["Pet"] = relationship("Pet")
    messages: Mapped[list["MentorMessage"]] = relationship(
        "MentorMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="MentorMessage.id",
    )


class MentorMessage(Base):
    __tablename__ = "mentor_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("mentor_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # "user" 或 "assistant"，跟 OpenAI chat messages 的 role 對應，重建
    # 歷史時直接拿來用，不用另外轉換
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 使用者這輪附的照片（例如「牠耳朵這樣正常嗎」附一張照片問），純文字
    # 訊息這欄是 None
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped["MentorSession"] = relationship(
        "MentorSession", back_populates="messages"
    )
