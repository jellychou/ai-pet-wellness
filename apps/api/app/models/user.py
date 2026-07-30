from datetime import date, datetime

from sqlalchemy import Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    # Google 帳號的唯一識別碼（ID token 的 "sub" claim）。帳密註冊的使用者沒有這欄，所以允許 null
    google_sub: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    picture_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # 帳密登入用的密碼雜湊（bcrypt）
    password_hash: Mapped[str] = mapped_column(String(255))
    # 基本資料（註冊 step 2），DB 層先開放 null，避免舊資料因為補欄位而炸掉，
    # 實際「註冊時必填」的規則交給 RegisterRequest schema 去把關
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    slogan: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # 忘記密碼用：重設 token 的雜湊值（不存明文）跟過期時間，兩者都有值且沒過期才算有效
    reset_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
