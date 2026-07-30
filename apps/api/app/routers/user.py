from fastapi import APIRouter, Depends, Path, HTTPException, Body
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
@router.put(f"/update-language/{id}", response_model=MessageResponse)
def update_language(
    id: int=Path(gt=0),
    payload: UpdateLanguageRequest = Body(...),
    db: Session = Depends(get_db),
) -> MessageResponse:
    current_user = db.query(User).filter(User.id == id).first()
    if current_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    current_user.language = payload.language
    db.commit()
    return MessageResponse(message="Language updated successfully")

# 更新使用者資料
@router.put(f"/update-user-info/{id}", response_model=MessageResponse)
def update_user_info(id: int=Path(gt=0), payload: UpdateUserInfoRequest = Body(...), db: Session = Depends(get_db)) -> MessageResponse:
    current_user = db.query(User).filter(User.id == id).first()
    if current_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    current_user.name = payload.name
    current_user.phone = payload.phone
    current_user.birthday = payload.birthday
    current_user.picture_url = payload.picture_url
    current_user.slogan = payload.slogan
    current_user.gender = payload.gender
    db.commit()
    return MessageResponse(message="User info updated successfully")

