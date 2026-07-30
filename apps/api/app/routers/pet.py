from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.pet import AddPetRequest
from sqlalchemy.orm import Session
from app.core.security import (
    get_current_user,
)
from app.schemas.pet import UpdatePetRequest


router = APIRouter(prefix="/pet", tags=["pet"])

# 取得所有的寵物
@router.get("/get-pets", status_code=status.HTTP_200_OK)
def get_pets(db: Session = Depends(get_db)):
    user = get_current_user(db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user.pets


# 取得單一寵物的資訊
@router.get("/get-pet/{pet_id}", status_code=status.HTTP_200_OK)
def get_pet(pet_id: int = Path(gt=0), db: Session = Depends(get_db)):
  user = get_current_user(db)
  if not user:
    raise HTTPException(status_code=401, detail="Unauthorized")
  existing = db.query(User).filter(User.id == user.id, User.pets.any(id=pet_id)).first()
  if not existing:
    raise HTTPException(status_code=404, detail="Pet not found")
  return existing.pets[0]


# 新增寵物
@router.post("/add-pet", status_code=status.HTTP_201_CREATED)
def add_pet(payload: AddPetRequest, db: Session = Depends(get_db)):  
    user = get_current_user(db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user.pets.append(payload.model_dump())
    db.commit()
    db.refresh(user)
    return user.pets[-1]  

# 更新寵物
@router.put("/update-pet", status_code=status.HTTP_200_OK)
def update_pet(payload: UpdatePetRequest, db: Session = Depends(get_db)):
    user = get_current_user(db)
    existing = db.query(User).filter(User.id == user.id, User.pets.any(id=payload.id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    existing.pets[0] = payload.model_dump()
    db.commit()
    db.refresh(existing)
    return existing.pets[0]


# 刪除寵物
@router.delete("/delete-pet/{pet_id}", status_code=status.HTTP_200_OK)
def delete_pet(pet_id: int = Path(gt=0), db: Session = Depends(get_db)):
    user = get_current_user(db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    existing = db.query(User).filter(User.id == user.id, User.pets.any(id=pet_id)).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Pet not found")
    existing.pets.remove(existing.pets[0])
    db.commit()
    db.refresh(existing)
    return {"message": "Pet deleted successfully"}