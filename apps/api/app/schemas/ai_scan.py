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


class AnalyzeImageResponse(BaseModel):
    summary: str
    findings: list[AiScanFinding]
    # 固定會帶這句提醒，前端一定要顯示，不能只顯示 findings——避免使用者
    # 把 AI 的初步推測當成真的診斷結果
    disclaimer: str
