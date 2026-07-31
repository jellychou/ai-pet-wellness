from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.pet import AddPetRequest, UpdatePetRequest

router = APIRouter(prefix="/pet", tags=["pet"])


def _find_pet(user: User, pet_id: int) -> dict | None:
    return next((p for p in user.pets if p.get("id") == pet_id), None)


# 取得所有的寵物：靠 token 認出是誰，只回傳自己的寵物
@router.get("/get-pets", status_code=status.HTTP_200_OK)
def get_pets(current_user: User = Depends(get_current_user)):
    return current_user.pets


# 取得單一寵物的資訊
@router.get("/get-pet/{pet_id}", status_code=status.HTTP_200_OK)
def get_pet(pet_id: int = Path(gt=0), current_user: User = Depends(get_current_user)):
    pet = _find_pet(current_user, pet_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 新增寵物：id 由後端自己配（目前最大 id + 1，陣列是空的就從 1 開始）
@router.post("/add-pet", status_code=status.HTTP_201_CREATED)
def add_pet(
    payload: AddPetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    next_id = max([p.get("id", 0) for p in current_user.pets], default=0) + 1
    new_pet = {"id": next_id, **payload.model_dump(mode="json")}
    # 注意：pets 是 JSONB 欄位，直接對 current_user.pets 做 .append() 這種
    # in-place 操作，SQLAlchemy 不會偵測到欄位有變、commit 後不會真的存進去，
    # 一定要整個重新賦值（= [...]）才會被追蹤到
    current_user.pets = [*current_user.pets, new_pet]
    current_user.active_pet_id = next_id
    db.commit()
    db.refresh(current_user)
    return new_pet


# 更新寵物：用 payload.id 找出陣列裡對應的那一筆，不是永遠改第一筆
@router.put("/update-pet", status_code=status.HTTP_200_OK)
def update_pet(
    payload: UpdatePetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if _find_pet(current_user, payload.id) is None:
        raise HTTPException(status_code=404, detail="Pet not found")

    updated_pet = payload.model_dump(mode="json")
    current_user.pets = [
        updated_pet if p.get("id") == payload.id else p for p in current_user.pets
    ]
    db.commit()
    db.refresh(current_user)
    return updated_pet


# 刪除寵物：用 pet_id 找出陣列裡對應的那一筆刪掉，不是永遠刪第一筆
@router.delete("/delete-pet/{pet_id}", status_code=status.HTTP_200_OK)
def delete_pet(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if _find_pet(current_user, pet_id) is None:
        raise HTTPException(status_code=404, detail="Pet not found")

    current_user.pets = [p for p in current_user.pets if p.get("id") != pet_id]
    if current_user.active_pet_id == pet_id:
        current_user.active_pet_id = (
            current_user.pets[0]["id"] if current_user.pets else None
        )
    db.commit()
    db.refresh(current_user)
    return {"message": "Pet deleted successfully"}
