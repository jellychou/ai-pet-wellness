from pydantic import BaseModel
from datetime import date


class AddVaccineRecordRequest(BaseModel):
    pet_id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    # 「待接種疫苗」還沒真的打，不會有施打日期/地點，所以這兩欄是選填；
    # 「已接種」的紀錄由前端的 AddVaccineFormDrawer 一定會帶值
    vaccination_date: date | None = None
    location: str | None = "hospital"
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    dose_count: str | None = None
    reminder_enabled: bool = True
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None
    recurring_enabled: bool = False
    recurring_interval: str | None = None


class UpdateVaccineRecordRequest(BaseModel):
    id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    vaccination_date: date | None = None
    location: str | None = "hospital"
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    dose_count: str | None = None
    reminder_enabled: bool = True
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None
    recurring_enabled: bool = False
    recurring_interval: str | None = None


# 回傳用：從 vaccine_records table 讀出來的一筆疫苗紀錄，靠 from_attributes
# 直接吃 ORM 的 VaccineRecord 物件（app/models/vaccine.py）
# vaccination_date 是 null 就代表這筆是「待接種」，有值就是「已接種」
class VaccineRecordOut(BaseModel):
    id: int
    pet_id: int
    vaccine_type: str
    vaccine_name: str
    batch_number: str | None = None
    vaccination_date: date | None = None
    location: str | None = None
    hospital: str | None = None
    vet: str | None = None
    note: str | None = None
    dose_count: str | None = None
    reminder_enabled: bool
    next_date: date | None = None
    reminder_lead_days: int | None = None
    next_note: str | None = None
    recurring_enabled: bool = False
    recurring_interval: str | None = None

    model_config = {"from_attributes": True}
