from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet


# 每一筆代表使用者按一次「+」記一次飲水量（例如 100ml/200ml 或自訂數字）。
# 跟 FoodRecord 一樣採「單筆事件」設計，不是「一天一筆、累加更新」——這樣
# Dashboard 的「今日飲水量」永遠是即時 sum 出來的，不用擔心併發更新互相覆蓋，
# 之後如果要做「查看今天分幾次喝」的紀錄列表也不用另外改資料結構
class WaterRecord(Base):
    __tablename__ = "water_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    pet: Mapped["Pet"] = relationship("Pet", back_populates="water_records")
