from datetime import datetime

from pydantic import BaseModel, Field


class AddWaterRecordRequest(BaseModel):
    pet_id: int
    amount_ml: int = Field(gt=0, le=5000)


class WaterRecordOut(BaseModel):
    id: int
    pet_id: int
    amount_ml: int
    recorded_at: datetime

    model_config = {"from_attributes": True}


# Dashboard 頂部「飲水量」卡片用——只回傳今天累計喝了多少 ml，target/percent
# 交給前端算（跟熱量目標一樣，用寵物體重推算，不用後端再存一份公式）
class WaterTodaySummaryOut(BaseModel):
    total_ml: int
