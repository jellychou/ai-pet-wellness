from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UpdateLanguageRequest, UpdateUserInfoRequest
from app.schemas.auth import UserOut
from app.schemas.index import (
    MessageResponse,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import (
    get_current_user,
)

router = APIRouter(prefix="/user", tags=["user"])


# 取得使用者資料：帶 token 驗證，回傳目前登入者自己的資料（不吃 client 傳的 id，避免任何人都能查到別人的資料）
@router.get("/user-info", response_model=UserOut)
def get_user_info(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


# 更新語言：一樣靠 token 認出是誰，只能改自己的語言偏好
@router.put("/update-language", response_model=MessageResponse)
def update_language(
    payload: UpdateLanguageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    current_user.language = payload.language
    db.commit()
    return MessageResponse(message="Language updated successfully")


# 更新使用者資料：一樣靠 token 認出是誰，只能改自己的資料
@router.put("/update-user-info", response_model=MessageResponse)
def update_user_info(
    payload: UpdateUserInfoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    current_user.name = payload.name
    current_user.phone = payload.phone
    current_user.birthday = payload.birthday
    current_user.picture_url = payload.picture_url
    current_user.slogan = payload.slogan
    current_user.gender = payload.gender
    db.commit()
    return MessageResponse(message="User info updated successfully")


# 寵物相關的 API 都在 app/routers/pet.py（/pet/get-pets 等），這裡不重複開一份
