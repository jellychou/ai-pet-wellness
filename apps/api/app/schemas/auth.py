from pydantic import BaseModel, EmailStr, Field
from datetime import date


class GoogleLoginRequest(BaseModel):
    # 前端 Google Identity Services 回傳的 ID token（一組 JWT）
    credential: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    phone: str
    birthday: date
    picture_url: str | None = None
    slogan: str | None = None
    # 前端目前的 UI 語言，給個預設值避免舊版前端沒送這欄就直接 422
    language: str = "zh-TW"
    gender: str | None = None
    # login_method 不吃這裡：帳密註冊一定是 "password"，由後端在 register() 裡自己認定，
    # 避免讓前端可以亂傳值影響帳號的登入方式紀錄


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

class SetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    picture_url: str | None = None
    phone: str | None = None
    birthday: date | None = None
    slogan: str | None = None
    language: str | None = None
    gender: str | None = None
    login_method: str | None = None
    is_set_password: bool = True
    # 前端登入成功後會直接讀 user.pets 來判斷要不要導去「新增寵物」頁，
    # 這裡沒有回傳的話，前端讀 data.user.pets.length 會直接 TypeError 炸掉
    pets: list[dict] = []
    active_pet_id: int | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
