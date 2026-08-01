from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.user import User


# 每打一次 OpenAI 圖片分析就記一筆，只用來算「這個使用者今天已經用了幾次」，
# 不是完整的分析結果紀錄（分析結果本身沒有另外存，跟之前的決定一致）。
# 用 user_id 算額度（不是 pet_id）——這是帳號層級的花費控管，不是某隻寵物的資料
class AiScanLog(Base):
    __tablename__ = "ai_scan_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
    pet: Mapped["Pet"] = relationship("Pet")
