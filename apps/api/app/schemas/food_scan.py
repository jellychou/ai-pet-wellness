from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Species = Literal["dog", "cat"]


# 前端已經把照片上傳到 Cloudinary 拿到公開網址了（跟其他 AI 分析功能同一套
# 流程），這裡直接傳網址給 OpenAI 的圖片辨識，不用讓後端再處理一次檔案上傳
class AnalyzeFoodRequest(BaseModel):
    pet_id: int
    image_url: str
    # 使用者上傳照片後、按「開始分析」前自己補充的說明，選填。跟
    # ai_scan.py 的 description 是同樣的概念，會附進送給 AI 的 prompt 裡
    description: str | None = None


# 每天可以打幾次 AI 食物辨識、目前用了幾次。跟 AiScanUsageOut 是同樣的概念，
# 但食物辨識跟寵物症狀辨識是各自獨立的額度（不同的 DAILY_LIMIT），所以獨立
# 一份 schema，不共用 ai_scan.py 那份
class FoodScanUsageOut(BaseModel):
    used: int
    limit: int
    unlimited: bool = False


# 逐項食材/品項分解裡的一項，例如「黑松露野菇燉飯」「干貝 x2」——低/高
# 都是估計範圍，不是精確值。included=false 表示 AI 判斷這項不該計入整份
# 餐點的總熱量（例如明顯沒吃完的配菜、純裝飾用的香草），note 可以簡短
# 說明為什麼
class FoodScanItem(BaseModel):
    name: str
    estimated_grams_low: float
    estimated_grams_high: float
    calories_low: float
    calories_high: float
    included: bool = True
    note: str = ""


class AnalyzeFoodResponse(BaseModel):
    # 照片裡有沒有真的辨識出食物；False 的話下面其他欄位都是無意義的預設值，
    # 前端要照這個欄位顯示「無法辨識」的狀態，不要硬是顯示假資料
    food_detected: bool
    food_name: str
    # 0-100，AI 自己估的信心程度，不是統計上嚴謹的機率
    confidence: int
    # 逐項食材/品項分解，最多 8 項（見 router 的 SYSTEM_PROMPT）
    items: list[FoodScanItem]
    # AI 直接目測估計「照片裡這一份」食物的總重量（公克，只加總 included
    # 的品項）——使用者身邊通常沒有秤，沒辦法先秤重再回報，所以不用每 100g
    # 密度、改成直接估這一份有多重。food_detected 是 false 時這裡是 0
    estimated_grams: float
    # 整份總熱量的估計範圍，跟 calories 的「單一最佳估計」互補顯示，
    # 例如畫面上可以同時顯示「約 730~960 kcal」跟「最佳估計 850 kcal」
    calories_low: float
    calories_high: float
    # 以下都是對應 estimated_grams「這一份」的總量估計，不是每 100g 密度。
    # calories 是單一最佳估計值
    calories: float
    protein: float
    fat: float
    carb: float
    fiber: float
    # 估算準確度的簡短說明，前端要顯示在結果卡片上，提醒使用者這是目測
    # 估計、不是秤重得出的精確值
    estimate_note: str
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
    user_note: str | None = None
    food_detected: bool
    food_name: str
    confidence: int
    items: list[FoodScanItem]
    estimated_grams: float
    calories_low: float
    calories_high: float
    calories: float
    protein: float
    fat: float
    carb: float
    fiber: float
    estimate_note: str
    safety_level: int
    is_safe: bool
    suitable_species: list[Species]
    suggestions: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
