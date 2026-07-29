import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """帳密登入用：把明文密碼雜湊後才存進 DB，絕不存明文。"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    """簽發我們自己的 session JWT。"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登入已過期或憑證無效，請重新登入",
        ) from exc
    return int(payload["sub"])


def generate_reset_token() -> str:
    """忘記密碼用的一次性 token（給使用者、放在信件連結裡的那組明文）。"""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """存進 DB 的是雜湊值，不是明文，這樣就算 DB 外洩，攻擊者也拿不到能用的 token。

    這裡刻意不用 bcrypt：bcrypt 每次雜湊會帶不同的隨機 salt，沒辦法直接拿去下
    `WHERE reset_token_hash = ?` 查表；reset token 本身已經是高熵的隨機字串，
    用一般雜湊（SHA-256）配合 DB 查詢就足夠安全，也才能真的查得到。
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登入",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="使用者不存在"
        )
    return user
