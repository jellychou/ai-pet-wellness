from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet


# 「加入飲食記錄」表單送出後真正存下來的一筆餵食紀錄，跟 FoodScanLog（AI
# 辨識當下的分析結果/額度計數）是兩件事：同一次辨識可能重新拍好幾次都沒有
# 真的送出、或使用者手動修改份量後才送出，兩邊資料量不會對等，分開兩張表
class FoodRecord(Base):
    __tablename__ = "food_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    portion_grams: Mapped[float] = mapped_column(Float, nullable=False)
    # 這一份（portion_grams）實際吃下去的總熱量，不是每 100g 的密度值——
    # 前端算好（calories_per_100g * portion_grams / 100）再送過來，後端
    # 不用重新知道食物本身的熱量密度也能記錄
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    # "breakfast" / "lunch" / "dinner" / "snack"，對應畫面上的早餐/午餐/晚餐/點心
    meal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    fed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    pet: Mapped["Pet"] = relationship("Pet", back_populates="food_records")
