from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.pet import Pet
from app.models.user import User
from app.models.vaccine import VaccineRecord
from app.schemas.vaccine import (
    AddVaccineRecordRequest,
    UpdateVaccineRecordRequest,
    VaccineRecordOut,
)

router = APIRouter(prefix="/vaccine", tags=["vaccine"])


# 找出「屬於這個使用者」的那隻寵物，找不到（包含 id 存在但是別人的）一律當 404，
# 跟 app/routers/pet.py 裡的 _get_owned_pet 是同一個防線，避免用別人的 pet_id
# 塞資料或查到別人的疫苗紀錄
def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 找出「屬於這個使用者的寵物」底下的那筆疫苗紀錄，透過 join pets 確認
# owner，一樣找不到就 404
def _get_owned_vaccine_record(
    db: Session, current_user: User, record_id: int
) -> VaccineRecord:
    record = (
        db.query(VaccineRecord)
        .join(Pet, VaccineRecord.pet_id == Pet.id)
        .filter(VaccineRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Vaccine record not found")
    return record


# 取得某隻寵物的所有疫苗紀錄，最新施打日期排前面
@router.get(
    "/get-vaccines/{pet_id}",
    response_model=list[VaccineRecordOut],
    status_code=status.HTTP_200_OK,
)
def get_vaccines(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(VaccineRecord)
        .filter(VaccineRecord.pet_id == pet_id)
        .order_by(VaccineRecord.vaccination_date.desc())
        .all()
    )


# 新增一筆疫苗紀錄
@router.post(
    "/add-vaccine",
    response_model=VaccineRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_vaccine(
    payload: AddVaccineRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 先確認 payload.pet_id 真的是這個使用者名下的寵物，擋掉塞別人 pet_id 的情況
    _get_owned_pet(db, current_user, payload.pet_id)
    new_record = VaccineRecord(**payload.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


# 更新一筆疫苗紀錄
@router.put(
    "/update-vaccine",
    response_model=VaccineRecordOut,
    status_code=status.HTTP_200_OK,
)
def update_vaccine(
    payload: UpdateVaccineRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = _get_owned_vaccine_record(db, current_user, payload.id)
    for field, value in payload.model_dump(exclude={"id"}).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


# 刪除一筆疫苗紀錄
@router.delete("/delete-vaccine/{record_id}", status_code=status.HTTP_200_OK)
def delete_vaccine(
    record_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = _get_owned_vaccine_record(db, current_user, record_id)
    db.delete(record)
    db.commit()
    return {"message": "Vaccine record deleted successfully"}
