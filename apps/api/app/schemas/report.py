from pydantic import BaseModel
from datetime import date
from typing import Literal

ReportType = Literal["1", "2", "3", "4", "5", "6"]

class ReportRecordOut(BaseModel):
  id: int
  pet_id: int
  report_date: date
  report_type: ReportType
  report_result: str
  report_weight: float
  report_temperature: float
  report_heart_rate: int
  report_hospital: str
  report_vet: str
  report_note: str
  report_files: list[str]


class AddReportRecordRequest(BaseModel):
  pet_id: int
  report_date: date
  report_type: ReportType
  report_result: str
  report_weight: float
  report_temperature: float
  report_heart_rate: int
  report_hospital: str
  report_vet: str
  report_note: str
  report_files: list[str]


class ReportRecordOut(BaseModel):
  id: int
  pet_id: int
  report_date: date
  report_type: ReportType
  report_result: str
  report_weight: float
  report_temperature: float
  report_heart_rate: int
  report_hospital: str
  report_vet: str
  report_note: str
  report_files: list[str]