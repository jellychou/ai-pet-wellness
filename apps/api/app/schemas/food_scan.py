from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Species = Literal["dog", "cat"]


# 前端已經把照片上傳到 Cloudinary 拿到公開網址了（跟其他 AI 分析功能同一套
# 流程），這裡直接傳網址給 OpenAI 的圖片辨識，不用讓後端再處理一次檔案上傳
class AnalyzeFoodRequest(BaseModel):
    pet_id: int
    image_url: str


# 每天可以打幾次 AI 食物辨識、目前用了幾次。跟 AiScanUsageOut 是同樣的概念，
# 但食物辨識跟寵物症狀辨識是各自獨立的額度（不同的 DAILY_LIMIT），所以獨立
# 一份 schema，不共用 ai_scan.py 那份
class FoodScanUsageOut(BaseModel):
    used: int
    limit: int
    unlimited: bool = False


class AnalyzeFoodResponse(BaseModel):
    # 照片裡有沒有真的辨識出食物；False 的話下面其他欄位都是無意義的預設值，
    # 前端要照這個欄位顯示「無法辨識」的狀態，不要硬是顯示假資料
    food_detected: bool
    food_name: str
    # 0-100，AI 自己估的信心程度，不是統計上嚴謹的機率
    confidence: int
    # 以下都是「每 100g」的估計值
    calories: float
    protein: float
    fat: float
    carb: float
    fiber: float
    # 1-5，星等式安全等級（5 = 很安全，1 = 危險/有毒）
    safety_level: int
    is_safe: bool
    suitable_species: list[Species]
    suggestions: list[str]
    # 固定會帶這句提醒，前端一定要顯示——AI 判斷的食物安全性只能參考，
    # 不確定的食物（尤其是人類食物）還是要諮詢獸醫
    disclaimer: str
    # 分析成功後，這次呼叫也算進當天次數了，直接把最新用量一起回傳，
    # 前端不用為了更新標語再多打一次 /usage-today
    usage: FoodScanUsageOut


# 「檢視記錄」列表用的一筆歷史紀錄，直接從 food_scan_logs 讀出來
class FoodScanHistoryItemOut(BaseModel):
    id: int
    pet_id: int
    image_url: str
    food_detected: bool
    food_name: str
    confidence: int
    calories: float
    protein: float
    fat: float
    carb: float
    fiber: float
    safety_level: int
    is_safe: bool
    suitable_species: list[Species]
    suggestions: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
