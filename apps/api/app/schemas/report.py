from pydantic import BaseModel
from datetime import date
from typing import Literal

ReportType = Literal["1", "2", "3", "4", "5", "6"]


class AddReportRecordRequest(BaseModel):
    pet_id: int
    report_date: date
    report_type: ReportType
    report_result: str
    report_weight: float
    # 體溫/心跳改成選填：在家記錄健檢時不一定量得到，不該卡住整筆送出
    report_temperature: float | None = None
    report_heart_rate: int | None = None
    report_hospital: str
    report_vet: str
    report_note: str | None = None
    report_files: list[str] = []


class UpdateReportRecordRequest(BaseModel):
    id: int
    report_date: date
    report_type: ReportType
    report_result: str
    report_weight: float
    # 體溫/心跳改成選填：在家記錄健檢時不一定量得到，不該卡住整筆送出
    report_temperature: float | None = None
    report_heart_rate: int | None = None
    report_hospital: str
    report_vet: str
    report_note: str | None = None
    report_files: list[str] = []


# 回傳用：從 report_records table 讀出來的一筆健康檢查紀錄，靠 from_attributes
# 直接吃 ORM 的 ReportRecord 物件（app/models/report.py）
class ReportRecordOut(BaseModel):
    id: int
    pet_id: int
    report_date: date
    report_type: ReportType
    report_result: str
    report_weight: float
    # 體溫/心跳改成選填：在家記錄健檢時不一定量得到，不該卡住整筆送出
    report_temperature: float | None = None
    report_heart_rate: int | None = None
    report_hospital: str
    report_vet: str
    report_note: str | None = None
    report_files: list[str] | None = None

    model_config = {"from_attributes": True}
