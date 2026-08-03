from __future__ import annotations

from datetime import date as date_
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.user import User


# 每打一次成功的「AI 健康日誌」分析就記一筆，跟 ai_scan_logs/food_scan_logs
# 同一套設計理由：一開始只是用來算「今天用了幾次」的計數器，同一張表順便
# 存分析結果本身，不用另外開一張歷史紀錄表。用 user_id 算每日額度（帳號
# 層級的花費控管），pet_id 留著給「檢視記錄」依寵物篩選、也給時間軸查詢用
class HealthJournalLog(Base):
    __tablename__ = "health_journal_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 這篇日誌記錄的是「哪一天」的狀況——跟 created_at（實際送出分析的時間）
    # 分開存，使用者理論上都是記當天，但畫面上有日期選擇器，不排除補記昨天
    log_date: Mapped[date_] = mapped_column(Date, nullable=False)
    # 以下 5 個都是畫面上的單選 toggle，直接存中文選項文字，不特別開 enum——
    # 這幾組選項是純前端定義的固定清單，跟 body_part（ai_scan.py）是同樣的
    # 處理方式，之後要調整選項不用動資料庫
    appetite: Mapped[str] = mapped_column(String(10), nullable=False)  # 食慾
    energy: Mapped[str] = mapped_column(String(10), nullable=False)  # 精神
    activity_level: Mapped[str] = mapped_column(String(10), nullable=False)  # 活動量
    bowel_movement: Mapped[str] = mapped_column(String(10), nullable=False)  # 排便
    vomiting: Mapped[str] = mapped_column(String(10), nullable=False)  # 嘔吐
    # 「其他症狀」——預設「無」的話存空陣列，使用者自己新增的症狀標籤存在
    # 這裡，字串陣列
    other_symptoms: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    # 文字日誌，選填，前端限制 500 字
    diary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 上傳的照片網址（Cloudinary），可以多張
    photo_urls: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    # 「更多標籤」——皮膚/耳朵/眼睛/口腔/行為/環境/用藥/其他，可複選
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")

    # 以下是 AI 分析出來的結果
    health_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # "低" / "中" / "高"，前端顯示時會自己接上「風險」兩個字
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False, server_default="")
    # 重點摘要，字串陣列
    summary_points: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    # 三個等級的建議，結構固定是 {"maintain": [...], "watch": [...], "concern": [...]}，
    # 對應畫面上的「可維持／建議觀察／需要留意」三個色塊
    recommendations: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )

    # 使用者按下「加入健康日誌」才會是 True——跟 ai_scan_logs 的
    # added_to_timeline 是同樣的邏輯，不是每次分析都自動算一筆時間軸事件
    added_to_timeline: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
    pet: Mapped["Pet"] = relationship("Pet")
