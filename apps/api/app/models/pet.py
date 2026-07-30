

from app.db.base import Base
from datetime import date
from sqlalchemy import String, Date, Float, Integer, JSONB

from sqlalchemy.orm import Mapped, mapped_column

class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    breed: Mapped[str] = mapped_column(String(255))
    gender: Mapped[str] = mapped_column(String(255))
    birthday: Mapped[date] = mapped_column(Date)
    weight: Mapped[float] = mapped_column(Float)
    coatColor: Mapped[str] = mapped_column(String(255))
    neutered: Mapped[str] = mapped_column(String(255))
    allergy: Mapped[str] = mapped_column(String(255))
    activity: Mapped[str] = mapped_column(String(255))
    chipNumber: str | None = None
    note: str | None = None
    photos: Mapped[list[str]] = mapped_column(JSONB)
    avatar: Mapped[str] = mapped_column(String(255))
    daily_calories_goal: Mapped[int] = mapped_column(Integer)
    daily_calories: Mapped[int] = mapped_column(Integer)
    health_score: Mapped[int] = mapped_column(Integer)
    daily_water_goal: Mapped[int] = mapped_column(Integer)
    daily_water: Mapped[int] = mapped_column(Integer)
    daily_mind: str | None = None