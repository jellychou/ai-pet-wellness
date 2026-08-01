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
# 的標語，還有超過額度時擋在使用者按下上傳之前，不用等後端真的回 429 才知道
class AiScanUsageOut(BaseModel):
    used: int
    limit: int


class AnalyzeImageResponse(BaseModel):
    summary: str
    findings: list[AiScanFinding]
    # 固定會帶這句提醒，前端一定要顯示，不能只顯示 findings——避免使用者
    # 把 AI 的初步推測當成真的診斷結果
    disclaimer: str
    # 分析成功後，這次呼叫也算進當天次數了，直接把最新用量一起回傳，
    # 前端不用為了更新標語再多打一次 /usage-today
    usage: AiScanUsageOut
