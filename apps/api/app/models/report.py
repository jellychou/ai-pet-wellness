from app.db.base import Base
from sqlalchemy import ForeignKey, String, Text, Date, Float, Integer, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date
from typing import Literal

ReportType = Literal["1", "2", "3", "4", "5", "6"]

class ReportRecord(Base):  
  __tablename__ = "report_records"

  id: Mapped[int] = mapped_column(primary_key=True)
  pet_id: Mapped[int] = mapped_column(ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
  report_date: Mapped[date] = mapped_column(Date, nullable=False)
  report_type: Mapped[ReportType] = mapped_column(String(100), nullable=False)
  report_result: Mapped[str] = mapped_column(String(100), nullable=False)
  report_weight: Mapped[float] = mapped_column(Float, nullable=False)
  report_temperature: Mapped[float] = mapped_column(Float, nullable=False)
  report_heart_rate: Mapped[int] = mapped_column(Integer, nullable=False)
  report_hospital: Mapped[str] = mapped_column(String(100), nullable=False)
  report_vet: Mapped[str] = mapped_column(String(100), nullable=False)
  report_note: Mapped[str] = mapped_column(Text, nullable=True)
  report_files: Mapped[list[str]] = mapped_column(JSONB, nullable=True)
