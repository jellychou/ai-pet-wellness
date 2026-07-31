from pydantic import BaseModel
from datetime import date


class AddVaccineRecordRequest(BaseModel):
    pet_id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    vaccination_date: date
    location: str = "hospital"
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    reminder_enabled: bool = True
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None


class UpdateVaccineRecordRequest(BaseModel):
    id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    vaccination_date: date
    location: str = "hospital"
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    reminder_enabled: bool = True
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None


# 回傳用：從 vaccine_records table 讀出來的一筆疫苗紀錄，靠 from_attributes
# 直接吃 ORM 的 VaccineRecord 物件（app/models/vaccine.py）
class VaccineRecordOut(BaseModel):
    id: int
    pet_id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    vaccination_date: date
    location: str
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    reminder_enabled: bool
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None

    model_config = {"from_attributes": True}
