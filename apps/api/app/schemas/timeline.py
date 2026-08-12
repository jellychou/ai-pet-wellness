from datetime import date
from typing import Literal

from pydantic import BaseModel

# food 現在也有真的資料表了（food_records），跟 ai_scan/health_journal 一樣
# 併進時間軸；ai_scan/health_journal 不是每筆分析都自動算一筆時間軸事件——
# 只有使用者按過「加入時間軸」/「加入健康日誌」（added_to_timeline=True）
# 的才會被 timeline.py 撈進來，這點跟 vaccine/report/food 無條件全撈不一樣
TimelineItemType = Literal["food", "vaccine", "report", "ai_scan", "health_journal"]


# 時間軸上的一筆項目——把不同來源的資料表攤平成同一種格式，前端不用管背後是
# 哪張表，只要照 type 選 icon 就好
class TimelineItemOut(BaseModel):
    type: TimelineItemType
    id: int
    date: date
    # "HH:MM"，只有來源資料表真的存了時間的才有值（食物/AI 分析用的是
    # datetime 欄位）；疫苗/健檢/健康日誌只存日期，沒有實際時間可以顯示，
    # 這裡就是 None，前端要對這種情況防呆，不要瞎掰一個時間出來
    time: str | None = None
    title: str
    summary: str | None = None
    # 只有食物/AI 分析這種本來就有拍照的類型才會有縮圖
    image_url: str | None = None
