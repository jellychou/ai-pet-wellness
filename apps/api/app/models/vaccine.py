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
    vaccination_date: Mapped[date] = mapped_column(Date, nullable=False)
    # "hospital"（動物醫院）或 "home"（自行施打），對應前端 AddVaccineFormDrawer
    # 的 ToggleGroup value
    location: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="hospital"
    )
    hospital: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vet: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    next_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reminder_lead_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="vaccine_records")
