from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.food_record import FoodRecord
from app.models.pet import Pet
from app.models.user import User
from app.schemas.food_record import AddFoodRecordRequest, FoodRecordOut

router = APIRouter(prefix="/food", tags=["food"])


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


# 取得某隻寵物的所有飲食紀錄，最新的排前面
@router.get(
    "/food-records/{pet_id}",
    response_model=list[FoodRecordOut],
    status_code=status.HTTP_200_OK,
)
def get_food_records(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(FoodRecord)
        .filter(FoodRecord.pet_id == pet_id)
        .order_by(FoodRecord.fed_at.desc(), FoodRecord.id.desc())
        .all()
    )


# 新增一筆飲食紀錄（「加入飲食記錄」表單送出）
@router.post(
    "/add-food-record",
    response_model=FoodRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_food_record(
    payload: AddFoodRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, payload.pet_id)
    new_record = FoodRecord(**payload.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


# 刪除一筆飲食紀錄
@router.delete("/delete-food-record/{record_id}", status_code=status.HTTP_200_OK)
def delete_food_record(
    record_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(FoodRecord)
        .join(Pet, FoodRecord.pet_id == Pet.id)
        .filter(FoodRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Food record not found")
    db.delete(record)
    db.commit()
    return {"message": "Food record deleted successfully"}
