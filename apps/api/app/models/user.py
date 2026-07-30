from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base
from pydantic import BaseModel


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    # Google 帳號的唯一識別碼（ID token 的 "sub" claim）。帳密註冊的使用者沒有這欄，所以允許 null
    google_sub: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    # 頭貼：存 base64 data URL（例如 "data:image/png;base64,...."），不是外部檔案網址，
    # 長度可能很長，用 Text（不限長度）而不是 String(1024)
    picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 帳密登入用的密碼雜湊（bcrypt）
    password_hash: Mapped[str] = mapped_column(String(255))
    # 基本資料（註冊 step 2），DB 層先開放 null，避免舊資料因為補欄位而炸掉，
    # 實際「註冊時必填」的規則交給 RegisterRequest schema 去把關
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    slogan: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # UI 語言偏好（例如 "zh-TW"、"en"）
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 帳號是怎麼建立的："password" 或 "google"，由後端在註冊/登入當下自己認定，不吃前端傳的值
    login_method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 是否已經設定過「自己知道的」密碼。帳密註冊一律 True；
    # 純 Google 登入建立的帳號預設 False（密碼欄位存的是使用者不會知道的隨機值），
    # 之後如果做「幫 Google 帳號補一組密碼」的功能，設定成功後要記得把這裡改成 True
    is_set_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
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



class  UpdateLanguageRequest(BaseModel):
    language: str

class UpdateUserInfoRequest(BaseModel):
    name: str
    phone: str
    birthday: date
    picture_url: str
    slogan: str
    language: str
    gender: str