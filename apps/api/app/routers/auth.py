from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.core.security import (
    get_current_user,
)
from app.schemas.index import (
    MessageResponse,
)



router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()



# Google 登入
@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def login_with_google(
    payload: GoogleLoginRequest, db: Session = Depends(get_db)
) -> TokenResponse:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="後端尚未設定 GOOGLE_CLIENT_ID",
        )

    try:
        # 向 Google 驗證這個 ID token 的簽章、有效期，
        # 並確認 audience 等於我們自己的 client id（避免拿別人 app 的 token 冒充）
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google 登入驗證失敗",
        ) from exc
    google_sub: str = idinfo["sub"]
    login_method: str = "google"
    email: str = idinfo["email"]
    name: str = idinfo.get("name") or email

    user = db.query(User).filter(User.google_sub == google_sub).first()

    if user is None:
        # 舊帳號可能是用同個 email 帳密註冊過、還沒綁過 google_sub，順便補上，
        # 這樣同一個 email 之後帳密、Google 兩種方式都能登入
        user = db.query(User).filter(User.email == email).first()

    # 兩次查詢都做完、確定最終 user 是誰之後再決定 picture：
    # 只要是既有帳號（不管是用 google_sub 還是 email 找到的），一律沿用它原本的 picture_url，
    # 不會被 Google 的照片蓋掉；只有全新帳號才用 Google 給的照片
    picture: str | None = user.picture_url if user else idinfo.get("picture")

    if user is None:
        # 全新帳號：Google 沒有給密碼，這裡先塞一組誰都猜不到、也永遠不會被拿去登入的雜湊值
        # （帳密登入會走 verify_password 比對，這組值不對應任何使用者會輸入的明文）
        user = User(
            google_sub=google_sub,
            email=email,
            name=name,
            picture_url=picture,
            password_hash=hash_password(generate_reset_token()),
            login_method=login_method,
            gender=None,
            language='zh-TW',
            slogan=None,
            is_set_password=False,
        )
        db.add(user)
    else:
        user.google_sub = google_sub
        user.name = name
        user.picture_url = picture

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


# 註冊
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
        birthday=payload.birthday,
        picture_url=payload.picture_url,
        slogan=payload.slogan,
        login_method="email",
        gender=payload.gender,
        language=payload.language,
        is_set_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


# 登入
@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
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


# 不管這個 email 有沒有註冊過，都回這句一模一樣的訊息，
# 避免有心人拿這支 API 去試哪些 email 有註冊（user enumeration）
_FORGOT_PASSWORD_MESSAGE = "如果這個信箱有註冊過帳號，我們已經寄出重設密碼的連結。"

# 忘記密碼
@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
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


# 重設密碼
@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
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


# 設定密碼
@router.post("/set-password", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def set_password(
    payload: SetPasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    user.password_hash = hash_password(payload.password)
    user.is_set_password = True
    db.commit()
    db.refresh(user)
    return MessageResponse(message="Password set successfully")


# 變更密碼
@router.post("/change-password", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def change_password(
    payload: SetPasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    user.password_hash = hash_password(payload.password)
    user.is_set_password = True
    db.commit()
    db.refresh(user)
    return MessageResponse(message="Password set successfully")    
