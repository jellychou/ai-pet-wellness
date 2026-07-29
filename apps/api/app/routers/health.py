from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(
    prefix="/health",
    tags=["health"],
)


@router.get("/")
def health() -> dict[str, str]:
    """存活檢查，不碰資料庫。"""
    return {"status": "ok"}


@router.get("/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """順便確認資料庫連線是否正常。"""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
