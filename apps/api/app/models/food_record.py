from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet


# 一次「加入飲食記錄」代表一餐（早餐/午餐/晚餐/點心），底下可以混合多個
# 食材/品項——例如同一餐同時吃了「小犬威力」+「K9 Natural」+「乾飼料」，
# 這三項各自的份量/熱量記在 FoodRecordItem，這裡只存「這一餐」共同的
# 屬性（吃飯時間、餐別、備註）跟一個方便直接讀取的 total_calories 加總值。
# 舊版設計是一筆記錄只能存一個食材，跟 AI 辨識支援多品項的能力不對等，
# 所以拆成這兩張表；跟 FoodScanLog（AI 辨識當下的分析結果/額度計數）
# 還是分開的兩件事，理由不變：同一次辨識可能重新拍好幾次都沒有真的送出、
# 或使用者手動調整份量後才送出，兩邊資料量不會對等
class FoodRecord(Base):
    __tablename__ = "food_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "breakfast" / "lunch" / "dinner" / "snack"，對應畫面上的早餐/午餐/晚餐/點心
    meal_type: Mapped[str] = mapped_column(String(20), nullable=False)
    fed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 底下所有 FoodRecordItem.calories 的加總——存這個欄位是為了讓 Dashboard
    # 的飲食記錄卡片不用每次都把 items 抓出來自己加總，直接讀這欄就好；
    # 新增/刪除這筆記錄時由 router 負責保持跟 items 加總一致
    total_calories: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    pet: Mapped["Pet"] = relationship("Pet", back_populates="food_records")
    # order_by created_at,id：新增順序就是使用者在畫面上排列食材的順序，
    # 不用額外加一個排序欄位
    items: Mapped[list["FoodRecordItem"]] = relationship(
        "FoodRecordItem",
        back_populates="food_record",
        cascade="all, delete-orphan",
        order_by="FoodRecordItem.id",
    )


# FoodRecord 底下的一個食材/品項——可能是這次拍照辨識出來的、也可能是
# 「從歷史選擇」直接沿用之前吃過的某個食材（這種情況下沒有對應的
# FoodScanLog，image_url 直接沿用歷史那筆的縮圖，不是重新分析出來的）
class FoodRecordItem(Base):
    __tablename__ = "food_record_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    food_record_id: Mapped[int] = mapped_column(
        ForeignKey("food_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    portion_grams: Mapped[float] = mapped_column(Float, nullable=False)
    # 這一項實際吃下去的總熱量，不是每 100g 的密度值——前端算好
    # （calories_per_gram * portion_grams）再送過來，後端只負責存
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    food_record: Mapped["FoodRecord"] = relationship(
        "FoodRecord", back_populates="items"
    )
