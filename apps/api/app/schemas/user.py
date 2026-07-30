from pydantic import BaseModel
from datetime import date

class UpdateLanguageRequest(BaseModel):
    language: str


class UpdateUserInfoRequest(BaseModel):
    name: str
    phone: str
    birthdate: date
    picture_url: str | None = None
    slogan: str | None = None
    language: str | None = None
    gender: str | None = None
