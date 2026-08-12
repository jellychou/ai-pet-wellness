from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Literal

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet

# 只是給型別檢查用的限制，資料庫欄位本身還是單純的 String，實際擋值要靠
# app/schemas/report.py 那邊的 Pydantic Literal（API 層才會真的擋掉不合法的值）
ReportType = Literal["1", "2", "3", "4", "5", "6"]


class ReportRecord(Base):
    __tablename__ = "report_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    report_type: Mapped[ReportType] = mapped_column(String(100), nullable=False)
    report_result: Mapped[str] = mapped_column(String(100), nullable=False)
    report_weight: Mapped[float] = mapped_column(Float, nullable=False)
    # 體溫/心跳改成選填——量體溫心跳需要器材，很多人在家記錄時量不到，
    # 不該卡住整筆健檢紀錄無法送出，所以欄位跟 report_note/report_files
    # 一樣是 nullable
    report_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    report_heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    report_hospital: Mapped[str] = mapped_column(String(100), nullable=False)
    report_vet: Mapped[str] = mapped_column(String(100), nullable=False)
    # 備註/附件都是選填，nullable=True 就要搭配 Optional 型別，不然跟
    # schemas/report.py 那邊非 optional 的欄位對不起來，遇到 NULL 值
    # 序列化就會炸
    report_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_files: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="report_records")
