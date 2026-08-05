from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.pet import Pet
from app.models.user import User
from app.models.water_record import WaterRecord
from app.schemas.water_record import (
    AddWaterRecordRequest,
    WaterRecordOut,
    WaterTodaySummaryOut,
)

router = APIRouter(prefix="/water", tags=["water"])


# 跟其他 router 的 _get_owned_pet 是同一套防線
def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 「今天」用 UTC 當天 00:00 起算，跟 food_scan.py/ai_scan.py 的每日額度計算
# 同一套簡化做法，不特別處理使用者所在時區
def _today_start() -> datetime:
    return datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


# 記一次飲水量（例如按下「+100ml」快速按鈕，或輸入自訂數字）
@router.post(
    "/add-record",
    response_model=WaterRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_water_record(
    payload: AddWaterRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, payload.pet_id)
    new_record = WaterRecord(pet_id=payload.pet_id, amount_ml=payload.amount_ml)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


# Dashboard 頂部「飲水量」卡片用——今天累計喝了多少 ml，target/百分比交給
# 前端用寵物體重推算，這裡只負責 sum 今天的紀錄
@router.get(
    "/today/{pet_id}",
    response_model=WaterTodaySummaryOut,
    status_code=status.HTTP_200_OK,
)
def get_today_summary(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    total = (
        db.query(func.coalesce(func.sum(WaterRecord.amount_ml), 0))
        .filter(
            WaterRecord.pet_id == pet_id,
            WaterRecord.recorded_at >= _today_start(),
        )
        .scalar()
    )
    return WaterTodaySummaryOut(total_ml=int(total))


# 「查看飲水紀錄」用的清單，最新的排前面——目前前端還沒有專屬畫面，
# 先開好這支之後要做歷史列表時不用再補後端
@router.get(
    "/records/{pet_id}",
    response_model=list[WaterRecordOut],
    status_code=status.HTTP_200_OK,
)
def get_water_records(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(WaterRecord)
        .filter(WaterRecord.pet_id == pet_id)
        .order_by(WaterRecord.recorded_at.desc(), WaterRecord.id.desc())
        .limit(50)
        .all()
    )
