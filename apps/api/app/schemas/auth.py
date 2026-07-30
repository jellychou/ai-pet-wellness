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
    birthdate: date
    picture_url: str | None = None
    slogan: str | None = None
    language: str | None = None
    gender: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    picture_url: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
