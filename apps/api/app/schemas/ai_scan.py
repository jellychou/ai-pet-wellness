from datetime import datetime

from pydantic import BaseModel


# 前端已經把照片上傳到 Cloudinary 拿到公開網址了（跟健康檢查附件同一套流程，
# 見 apps/web/src/lib/cloudinary.ts），這裡直接傳網址給 OpenAI 的圖片辨識，
# 不用讓後端再處理一次檔案上傳
class AnalyzeImageRequest(BaseModel):
    pet_id: int
    image_url: str


class AiScanFinding(BaseModel):
    condition: str
    # 0-100，AI 自己估的信心程度，不是統計上嚴謹的機率
    confidence: int
    description: str


# 每天可以打幾次 AI 圖片分析、目前用了幾次——前端拿來顯示「今日已使用 X/5 次」
# 的標語，還有超過額度時擋在使用者按下上傳之前，不用等後端真的回 429 才知道。
# unlimited 給 admin 帳號用：limit/used 還是會帶正常數字（方便顯示「已使用
# 幾次」這件事本身），但前端看到 unlimited=True 就不該把 used>=limit 當成
# 擋下上傳的理由
class AiScanUsageOut(BaseModel):
    used: int
    limit: int
    unlimited: bool = False


class AnalyzeImageResponse(BaseModel):
    summary: str
    findings: list[AiScanFinding]
    # 具體可執行的建議/注意事項，最多 3 條——跟 food_scan 的 suggestions
    # 是同樣的概念
    suggestions: list[str]
    # 固定會帶這句提醒，前端一定要顯示，不能只顯示 findings——避免使用者
    # 把 AI 的初步推測當成真的診斷結果
    disclaimer: str
    # 分析成功後，這次呼叫也算進當天次數了，直接把最新用量一起回傳，
    # 前端不用為了更新標語再多打一次 /usage-today
    usage: AiScanUsageOut


# 「檢視記錄」列表用的一筆歷史紀錄，直接從 ai_scan_logs 讀出來，
# findings 存的是原始 JSON，用 from_attributes 直接吃 ORM 物件
class AiScanHistoryItemOut(BaseModel):
    id: int
    pet_id: int
    image_url: str
    summary: str
    findings: list[AiScanFinding] | None = None
    created_at: datetime
    suggestions: list[str] | None = None

    model_config = {"from_attributes": True}
