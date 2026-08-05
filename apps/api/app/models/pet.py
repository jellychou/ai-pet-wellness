from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.vaccine import VaccineRecord
    from app.models.report import ReportRecord
    from app.models.food_record import FoodRecord
    from app.models.water_record import WaterRecord


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 一定要有真正的 FK，才能用資料庫層的查詢/約束（之前放在 users.pets JSONB
    # 裡的時候，pet_id 只是陣列元素裡的一個裸數字，完全沒有這層保護）
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # "dog" 或 "cat"。之後算熱量/營養素的時候，狗跟貓的比例需求差很多
    # （貓是肉食動物，蛋白質需求比狗高很多），需要這個欄位才能分開算
    species: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="dog"
    )
    breed: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    birthday: Mapped[date] = mapped_column(Date, nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    coatColor: Mapped[str] = mapped_column(String(50), nullable=False)
    neutered: Mapped[str] = mapped_column(String(10), nullable=False)
    allergy: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    activity: Mapped[str] = mapped_column(String(50), nullable=False)
    chipNumber: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 跟 User.picture_url 一樣可能是 base64 圖片字串，用 Text 避免長度不夠爆掉
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="pets", foreign_keys=[user_id]
    )
    # 寵物被刪除時，屬於牠的疫苗紀錄也一起刪掉，不留孤兒資料
    vaccine_records: Mapped[list["VaccineRecord"]] = relationship(
        "VaccineRecord", back_populates="pet", cascade="all, delete-orphan"
    )
    # 健康檢查報告，寵物被刪除時一併刪掉
    report_records: Mapped[list["ReportRecord"]] = relationship(
        "ReportRecord", back_populates="pet", cascade="all, delete-orphan"
    )
    # 飲食記錄，寵物被刪除時一併刪掉
    food_records: Mapped[list["FoodRecord"]] = relationship(
        "FoodRecord", back_populates="pet", cascade="all, delete-orphan"
    )
    # 飲水記錄，寵物被刪除時一併刪掉
    water_records: Mapped[list["WaterRecord"]] = relationship(
        "WaterRecord", back_populates="pet", cascade="all, delete-orphan"
    )
