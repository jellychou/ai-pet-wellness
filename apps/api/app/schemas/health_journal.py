from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

Appetite = Literal["很好", "正常", "偏差", "不好"]
Energy = Literal["很好", "正常", "偏差", "不好"]
ActivityLevel = Literal["多", "正常", "偏少", "很少"]
BowelMovement = Literal["正常", "偏軟", "偏硬", "腹瀉"]
Vomiting = Literal["無", "1次", "多次"]
RiskLevel = Literal["低", "中", "高"]


# 前端已經把照片上傳到 Cloudinary 拿到公開網址了（跟其他 AI 分析功能同一套
# 流程），這裡直接傳網址陣列給 OpenAI，不用讓後端再處理一次檔案上傳
class AnalyzeJournalRequest(BaseModel):
    pet_id: int
    log_date: date
    appetite: Appetite
    energy: Energy
    activity_level: ActivityLevel
    bowel_movement: BowelMovement
    vomiting: Vomiting
    other_symptoms: list[str] = []
    diary_text: str | None = None
    photo_urls: list[str] = []
    tags: list[str] = []


class HealthJournalUsageOut(BaseModel):
    used: int
    limit: int
    unlimited: bool = False


# 對應畫面上「可維持／建議觀察／需要留意」三個色塊，各自底下的建議列表
class JournalRecommendations(BaseModel):
    maintain: list[str] = []
    watch: list[str] = []
    concern: list[str] = []


class AnalyzeJournalResponse(BaseModel):
    # 這次分析在 health_journal_logs 裡的 id——「加入健康日誌」要靠這個 id
    # 呼叫 /health-journal/{id}/add-to-timeline
    id: int
    log_date: date
    health_score: int
    # 跟同一隻寵物「前一篇」（log_date 較早的最近一篇）健康評分的差——沒有
    # 前一篇可以比的話是 None，前端遇到 None 就不顯示「較昨日...」那行，
    # 不要顯示成 0（0 分差跟「沒有可比較的資料」是兩件不一樣的事）
    score_delta: int | None = None
    risk_level: RiskLevel
    summary_points: list[str]
    recommendations: JournalRecommendations
    # 固定會帶這句提醒，前端一定要顯示——AI 的健康評分只是初步觀察，
    # 不能取代獸醫的專業判斷
    disclaimer: str
    usage: HealthJournalUsageOut


# 「檢視記錄」列表用的一筆歷史紀錄，直接從 health_journal_logs 讀出來
class HealthJournalHistoryItemOut(BaseModel):
    id: int
    pet_id: int
    log_date: date
    appetite: str
    energy: str
    activity_level: str
    bowel_movement: str
    vomiting: str
    other_symptoms: list[str] = []
    diary_text: str | None = None
    photo_urls: list[str] = []
    tags: list[str] = []
    health_score: int
    risk_level: str
    summary_points: list[str] = []
    recommendations: JournalRecommendations
    added_to_timeline: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AddToTimelineResponse(BaseModel):
    id: int
    added_to_timeline: bool
