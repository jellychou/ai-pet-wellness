from pydantic import BaseModel
from datetime import date


class AddPetRequest(BaseModel):
    name: str
    breed: str
    gender: str
    birthday: date
    weight: float
    coatColor: str
    neutered: str
    allergy: str
    activity: str
    chipNumber: str | None = None
    note: str | None = None
    avatar: str | None = None
    is_active: bool = False


class UpdatePetRequest(BaseModel):
    id: int
    name: str
    breed: str
    gender: str
    birthday: date
    weight: float
    coatColor: str
    neutered: str
    allergy: str
    activity: str
    chipNumber: str | None = None
    note: str | None = None
    is_active: bool = False
    avatar: str | None = None


# 回傳用：從真正的 pets table 讀出來的一筆寵物資料，靠 from_attributes 直接吃
# ORM 的 Pet 物件（app/models/pet.py），欄位要跟那邊的欄位對得上
class PetOut(BaseModel):
    id: int
    name: str
    breed: str
    gender: str
    birthday: date
    weight: float
    coatColor: str
    neutered: str
    allergy: str
    activity: str
    chipNumber: str | None = None
    note: str | None = None
    avatar: str | None = None
    is_active: bool = False

    model_config = {"from_attributes": True}