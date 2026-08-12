from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pet import Pet
    from app.models.user import User


# 每打一次成功的 OpenAI 圖片分析就記一筆。一開始只是用來算「今天用了幾次」
# 的計數器，後來加上「檢視記錄」功能後，同一張表也順便存分析結果本身，
# 不用另外開一張歷史紀錄表——反正每次成功呼叫本來就要寫一筆，資料筆數是一樣的。
# 用 user_id 算每日額度（不是 pet_id）——這是帳號層級的花費控管，不是某隻寵物的資料，
# 但 pet_id 還是留著，「檢視記錄」要能依寵物篩選
class AiScanLog(Base):
    __tablename__ = "ai_scan_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 上傳去分析的那張照片網址（Cloudinary），檢視記錄時當縮圖用
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    # 使用者上傳照片時指定的部位（皮膚/耳朵/眼睛/牙齒/腳掌/排泄物/嘔吐物/
    # 其他），選填——會一併附進送給 OpenAI 的 prompt，讓分析更聚焦，不是
    # 只拿來顯示用
    body_part: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 使用者的補充文字說明（例如「最近一直舔腳，皮膚有點紅腫」），選填，
    # 同樣會附進 prompt
    user_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    # AiScanFinding 陣列的原始 JSON（condition/confidence/description），
    # 不特別開 schema 綁死結構，反正只是拿來顯示，不會再被程式邏輯拿去運算
    findings: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # 具體建議/注意事項的字串陣列，最多 3 條——跟 food_scan_logs 的
    # suggestions 是同樣的概念與用法
    suggestions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # 使用者按下「加入時間軸」才會是 True——不是每次分析都自動算一筆
    # 時間軸事件（隨手拍的照片不一定值得留在時間軸上）。/timeline/{pet_id}
    # 只會撈這個欄位是 True 的紀錄，做法跟 vaccine_records/report_records
    # 被 timeline.py 攤平讀取是同一套邏輯，差別只在多了這層「使用者選擇性
    # 加入」的篩選條件
    added_to_timeline: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
    pet: Mapped["Pet"] = relationship("Pet")
