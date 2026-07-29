from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    generate_reset_token,
    get_current_user,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="這個 email 已經被註冊過了",
        )

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        birthdate=payload.birthdate,
        picture_url=payload.picture_url,
        slogan=payload.slogan,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    # user 不存在，或密碼不對，一律回同一種錯誤，
    # 避免讓人用回應差異去猜哪個 email 有沒有註冊過
    if (
        user is None
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="email 或密碼錯誤",
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/user-info", response_model=UserOut)
def get_user_info(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


# 不管這個 email 有沒有註冊過，都回這句一模一樣的訊息，
# 避免有心人拿這支 API 去試哪些 email 有註冊（user enumeration）
_FORGOT_PASSWORD_MESSAGE = "如果這個信箱有註冊過帳號，我們已經寄出重設密碼的連結。"


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    if user is not None:
        token = generate_reset_token()
        user.reset_token_hash = hash_reset_token(token)
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.reset_token_expires_minutes
        )
        db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        send_password_reset_email(user.email, reset_link)

    return MessageResponse(message=_FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    token_hash = hash_reset_token(payload.token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()

    now = datetime.now(timezone.utc)
    if (
        user is None
        or user.reset_token_expires_at is None
        or user.reset_token_expires_at < now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="重設連結無效或已過期，請重新申請",
        )

    user.password_hash = hash_password(payload.new_password)
    # 用過就作廢，避免同一個連結被重複使用
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()

    return MessageResponse(message="密碼已更新，請用新密碼登入")
