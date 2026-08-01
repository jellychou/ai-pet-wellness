from datetime import date
from typing import Literal

from pydantic import BaseModel

# 飲食/心情之後有真的資料表了，再把對應的 type 加進來、query 裡一併撈就好。
# ai_scan 現在已經有資料表了（ai_scan_logs），但不是每筆分析都自動算一筆
# 時間軸事件——只有使用者按過「加入健康時間軸」（added_to_timeline=True）
# 的才會被 timeline.py 撈進來，這點跟 vaccine/report 無條件全撈不一樣
TimelineItemType = Literal["vaccine", "report", "ai_scan"]


# 時間軸上的一筆項目——把不同來源的資料表（vaccine_records / report_records）
# 攤平成同一種格式，前端不用管背後是哪張表，只要照 type 選 icon 就好
class TimelineItemOut(BaseModel):
    type: TimelineItemType
    id: int
    date: date
    title: str
    summary: str | None = None
