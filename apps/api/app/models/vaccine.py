from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet


class VaccineRecord(Base):
    __tablename__ = "vaccine_records"

    # 疫苗紀錄是「一隻寵物、很多筆」的歷史資料（同一種疫苗每年都要重打），
    # 沒辦法塞進 pets 表的固定欄位，所以獨立開一張表，用 pet_id 當 FK。
    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaccine_type: Mapped[str] = mapped_column(String(100), nullable=False)
    vaccine_name: Mapped[str] = mapped_column(String(100), nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 「待接種疫苗」還沒真的打，這欄會是 null；「已接種」的紀錄才會填實際施打日期。
    # 是不是待接種，靠這欄是不是 null 判斷，不用另外加一個 status 欄位。
    vaccination_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # "hospital"（動物醫院）或 "home"（自行施打），對應前端 AddVaccineFormDrawer
    # 的 ToggleGroup value；待接種疫苗還沒發生，這欄會明確傳 null。
    # 注意：這裡刻意不設 server_default——SQLAlchemy 對「欄位有 server_default
    # 時，Python 端明確設成 None」的處理方式是讓 server_default 蓋過去，不會真的
    # 存成 NULL，待接種疫苗的 location 就會被誤存成 "hospital"。要不要有預設值
    # 交給前端/Pydantic schema 層處理就好。
    location: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hospital: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vet: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 待接種疫苗預計要打幾劑（例如幼犬打三劑五合一），"1"/"2"/"3+"
    dose_count: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reminder_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    next_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reminder_lead_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 週期性提醒（例如每年都要再提醒一次），開啟時搭配 recurring_interval
    # （例如 "6_months"、"1_year"、"3_years"）使用
    recurring_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    recurring_interval: Mapped[str | None] = mapped_column(String(20), nullable=True)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="vaccine_records")
