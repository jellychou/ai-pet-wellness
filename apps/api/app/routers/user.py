from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UpdateLanguageRequest, UpdateUserInfoRequest
from app.schemas.index import (
    MessageResponse,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import (
    get_current_user,
)

router = APIRouter(prefix="/user", tags=["user"])

# 更新語言
@router.put("/update-language", response_model=MessageResponse)
def update_language(
    payload: UpdateLanguageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    current_user.language = payload.language
    db.commit()
    return MessageResponse(message="Language updated successfully")

# 更新使用者資料
@router.put("/update-user-info", response_model=MessageResponse)
def update_user_info(payload: UpdateUserInfoRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MessageResponse:
    current_user.name = payload.name
    current_user.phone = payload.phone
    current_user.birthday = payload.birthday
    current_user.picture_url = payload.picture_url
    current_user.slogan = payload.slogan
    current_user.gender = payload.gender
    db.commit()
    return MessageResponse(message="User info updated successfully")

