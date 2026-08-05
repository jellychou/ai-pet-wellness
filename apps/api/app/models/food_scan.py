from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.user import User


# 每打一次成功的「AI 食物辨識」就記一筆，同時兼兩個用途：算「今天用了幾次」
# 的每日額度計數器，以及「檢視記錄」列表要顯示的歷史資料——跟 AiScanLog
# 是同一個設計理由，不需要另外開一張純計數用的表。
# 用 user_id 算每日額度（帳號層級的花費控管），pet_id 留著給「檢視記錄」
# 依寵物篩選、以及「加入飲食記錄」知道要記到哪隻寵物名下
class FoodScanLog(Base):
    __tablename__ = "food_scan_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 上傳去分析的那張照片網址（Cloudinary），檢視記錄時當縮圖用
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    # 使用者上傳照片後、按「開始分析」前自己補充的說明（例如「這是剛買的
    # 潔牙骨，包裝上寫著XX品牌」），選填。跟 ai_scan.py 的 user_note 是
    # 同樣的概念——先讓使用者補充一段文字再送出分析，AI 判斷時可以參考，
    # 不是只能單靠照片本身
    user_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 照片裡有沒有真的辨識出食物——AI 有時候會拍到不是食物的東西（例如空盤子、
    # 包裝袋），這種情況下面的營養/安全欄位沒有意義，前端要照這個欄位顯示
    # 「無法辨識」的狀態，不要硬是顯示一堆假資料
    food_detected: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    food_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # 0-100，AI 自己估的信心程度，不是統計上嚴謹的機率
    confidence: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    # 逐項食材/品項分解：[{name, estimated_grams_low, estimated_grams_high,
    # calories_low, calories_high, included, note}, ...]。included=false 的
    # 項目（例如明顯沒吃完的配菜）不計入下面的 estimated_grams/calories 加總，
    # 但還是保留在列表裡讓使用者看到「有看到這個但沒算進去」
    items: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    # AI 直接目測估計「照片裡這一份」食物的總重量（公克，只加總 included 的
    # 品項）——使用者身上通常沒有秤，沒辦法回報實際重量，所以改成請 AI 直接
    # 估重，下面 calories/protein/fat/carb/fiber 都是對應這個總重量的整份
    # 總量，不是每 100g 密度
    estimated_grams: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0"
    )
    # 整份總熱量的估計範圍（下限/上限），跟 calories 的「單一最佳估計」互補
    calories_low: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0"
    )
    calories_high: Mapped[float] = mapped_column(
        Float, nullable=False, server_default="0"
    )
    # 以下都是整份餐點（對應 estimated_grams）的總量估計，不是每 100g 密度。
    # calories 是單一最佳估計值，通常落在 calories_low ~ calories_high 之間
    calories: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    protein: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    fat: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    carb: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    fiber: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    water: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    # 估算準確度的簡短說明（例如「只能做估算，誤差可能約 ±20~30%」），
    # 前端要顯示在結果卡片上，避免使用者把估計值當成秤重般精確的數字
    estimate_note: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    # 1-5，星等式的安全等級（5 = 很安全，1 = 危險/有毒）
    safety_level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="3")
    is_safe: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    # 這個食物適合餵的物種，["dog", "cat"] 的子集合，可能是空陣列（兩種都不適合）
    suitable_species: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    # 建議與注意事項，字串陣列，直接對應畫面上的條列項目
    suggestions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
    pet: Mapped["Pet"] = relationship("Pet")
