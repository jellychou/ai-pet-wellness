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