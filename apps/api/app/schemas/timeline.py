from datetime import date
from typing import Literal

from pydantic import BaseModel

# 目前只有疫苗紀錄跟健康檢查紀錄是真的有後端資料，飲食/心情/AI 診斷等
# 之後有真的資料表了，再把對應的 type 加進來、query 裡一併撈就好
TimelineItemType = Literal["vaccine", "report"]


# 時間軸上的一筆項目——把不同來源的資料表（vaccine_records / report_records）
# 攤平成同一種格式，前端不用管背後是哪張表，只要照 type 選 icon 就好
class TimelineItemOut(BaseModel):
    type: TimelineItemType
    id: int
    date: date
    title: str
    summary: str | None = None
