from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.food_record import FoodRecord, FoodRecordItem
from app.models.pet import Pet
from app.models.user import User
from app.models.water_record import WaterRecord
from app.schemas.food_record import (
    AddFoodRecordRequest,
    FoodRecordOut,
    HistoryFoodItemOut,
)

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


# 取得某隻寵物的所有飲食紀錄，最新的排前面——用 selectinload 一次把每筆記錄
# 底下的 items 撈出來，不然 FoodRecordOut 讀 .items 時每筆都會多打一次查詢
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
        .options(selectinload(FoodRecord.items))
        .filter(FoodRecord.pet_id == pet_id)
        .order_by(FoodRecord.fed_at.desc(), FoodRecord.id.desc())
        .all()
    )


# 新增一筆飲食紀錄（「加入飲食記錄」表單送出）——一次可以帶多個食材/品項，
# 分別存成各自的 FoodRecordItem，total_calories 由後端加總，不信任前端
# 算好的總和（前端調整份量時是即時算的，防止傳輸過程中跟 items 兜不起來）
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
    total_calories = sum(item.calories for item in payload.items)
    new_record = FoodRecord(
        pet_id=payload.pet_id,
        meal_type=payload.meal_type,
        fed_at=payload.fed_at,
        note=payload.note,
        total_calories=total_calories,
        items=[
            FoodRecordItem(
                food_name=item.food_name,
                image_url=item.image_url,
                portion_grams=item.portion_grams,
                calories=item.calories,
            )
            for item in payload.items
        ],
    )
    db.add(new_record)

    # 濕食/湯泡飯本身含的水分也算進當天喝水量——items[].water_ml 只是拿來
    # 加總的輸入，不會存進 food_record_items（那張表沒有這欄），這裡直接
    # 生一筆 WaterRecord，recorded_at 用 fed_at（吃飯的時間）而不是現在儲存
    # 的時間，這樣「今日飲水量」才會算在正確的那一天，不是使用者晚點才
    # 補記錄的當下
    total_water_ml = round(sum(item.water_ml for item in payload.items))
    if total_water_ml > 0:
        db.add(
            WaterRecord(
                pet_id=payload.pet_id,
                amount_ml=total_water_ml,
                recorded_at=payload.fed_at,
            )
        )

    db.commit()
    db.refresh(new_record)
    return new_record


# 刪除一筆飲食紀錄——底下的 food_record_items 靠 FK ondelete="CASCADE"
# 跟著一起刪，不用另外手動刪
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


# 「從歷史選擇」picker 用的清單——依 food_name 彙整這隻寵物過去所有飲食記錄
# 裡出現過的品項，不是另外開一張「常用食材庫」表讓使用者手動維護。用
# Python 在記憶體裡彙整（不是寫成一條 SQL group by）：因為除了「出現幾次」
# 之外還要「最近一次的份量/熱量/圖片」，混在一起寫成單一 SQL 需要 window
# function，這個 app 的資料量級（單一使用者、單一寵物的飲食記錄）用 Python
# 處理起來更直覺、也更好維護
@router.get(
    "/history-items/{pet_id}",
    response_model=list[HistoryFoodItemOut],
    status_code=status.HTTP_200_OK,
)
def get_history_items(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    rows = (
        db.query(FoodRecordItem, FoodRecord.fed_at)
        .join(FoodRecord, FoodRecordItem.food_record_id == FoodRecord.id)
        .filter(FoodRecord.pet_id == pet_id)
        .order_by(FoodRecord.fed_at.desc(), FoodRecordItem.id.desc())
        .all()
    )

    counts: dict[str, int] = {}
    latest: dict[str, HistoryFoodItemOut] = {}
    for item, fed_at in rows:
        counts[item.food_name] = counts.get(item.food_name, 0) + 1
        # rows 已經照 fed_at 新到舊排序，同一個 food_name 第一次出現的就是
        # 最近一次吃的那筆，後面重複出現的不用再覆寫
        if item.food_name not in latest:
            latest[item.food_name] = HistoryFoodItemOut(
                food_name=item.food_name,
                image_url=item.image_url,
                portion_grams=item.portion_grams,
                calories=item.calories,
                times_used=0,
                last_used_at=fed_at,
            )

    results = list(latest.values())
    for result in results:
        result.times_used = counts[result.food_name]
    results.sort(key=lambda r: (r.times_used, r.last_used_at), reverse=True)
    return results[:30]
