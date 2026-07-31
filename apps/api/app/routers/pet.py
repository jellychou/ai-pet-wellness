from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.pet import Pet
from app.models.user import User
from app.schemas.pet import AddPetRequest, PetOut, UpdatePetRequest

router = APIRouter(prefix="/pet", tags=["pet"])


# 找出「屬於這個使用者」的那一筆寵物，找不到（包含 id 存在但是別人的）一律當 404，
# 不要讓人可以用別人的 pet_id 查到/改到不是自己的寵物
def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 取得所有的寵物：靠 token 認出是誰，只回傳自己的寵物
@router.get("/get-pets", response_model=list[PetOut], status_code=status.HTTP_200_OK)
def get_pets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Pet)
        .filter(Pet.user_id == current_user.id)
        .order_by(Pet.id)
        .all()
    )


# 取得單一寵物的資訊
@router.get(
    "/get-pet/{pet_id}", response_model=PetOut, status_code=status.HTTP_200_OK
)
def get_pet(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_pet(db, current_user, pet_id)


# 新增寵物：id 交給資料庫的 serial 主鍵配，不用像 JSONB 版本那樣自己在
# Python 算 max(id)+1
@router.post("/add-pet", response_model=PetOut, status_code=status.HTTP_201_CREATED)
def add_pet(
    payload: AddPetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_pet = Pet(user_id=current_user.id, **payload.model_dump())
    db.add(new_pet)
    db.flush()  # 先把 insert 送出去拿到 new_pet.id，還不用整個 commit
    current_user.active_pet_id = new_pet.id
    db.commit()
    db.refresh(new_pet)
    return new_pet


# 更新寵物：用 payload.id 找出自己名下對應的那一筆再改欄位，
# 是真正的 UPDATE，不用像 JSONB 版本那樣整個陣列重新賦值
@router.put("/update-pet", response_model=PetOut, status_code=status.HTTP_200_OK)
def update_pet(
    payload: UpdatePetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pet = _get_owned_pet(db, current_user, payload.id)
    for field, value in payload.model_dump(exclude={"id"}).items():
        setattr(pet, field, value)
    db.commit()
    db.refresh(pet)
    return pet


# 刪除寵物：用 pet_id 找出自己名下對應的那一筆刪掉
@router.delete("/delete-pet/{pet_id}", status_code=status.HTTP_200_OK)
def delete_pet(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pet = _get_owned_pet(db, current_user, pet_id)
    was_active = current_user.active_pet_id == pet_id
    db.delete(pet)
    db.flush()

    if was_active:
        # users.active_pet_id 有 ON DELETE SET NULL，刪掉寵物的當下資料庫已經
        # 自動把它設回 NULL 了；這裡再挑一隻剩下的寵物頂上，沒有的話就維持 NULL
        remaining = (
            db.query(Pet)
            .filter(Pet.user_id == current_user.id)
            .order_by(Pet.id)
            .first()
        )
        current_user.active_pet_id = remaining.id if remaining else None

    db.commit()
    return {"message": "Pet deleted successfully"}
