from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


class FoodRecordItemIn(BaseModel):
    food_name: str
    image_url: str | None = None
    portion_grams: float
    # 前端算好「這一項」的總熱量（calories_per_gram * portion_grams）再送過來，
    # 後端只負責存跟加總，不重新計算
    calories: float
    # 前端算好「這一項」估計含多少水分（water_per_gram * portion_grams），
    # 只在這裡當輸入用來加總成一筆 WaterRecord（見 add_food_record），
    # 不會存進 food_record_items 表——「從歷史選擇」來源沒有水分資料，
    # 前端固定會傳 0，不是欄位遺漏
    water_ml: float = 0


class FoodRecordItemOut(BaseModel):
    id: int
    food_name: str
    image_url: str | None = None
    portion_grams: float
    calories: float

    model_config = {"from_attributes": True}


class AddFoodRecordRequest(BaseModel):
    pet_id: int
    # 一餐可以混合多個食材/品項，至少要有一項——沒有食材的「飲食記錄」沒有意義
    items: list[FoodRecordItemIn] = Field(min_length=1)
    meal_type: MealType
    fed_at: datetime
    note: str | None = None


class FoodRecordOut(BaseModel):
    id: int
    pet_id: int
    items: list[FoodRecordItemOut]
    total_calories: float
    meal_type: MealType
    fed_at: datetime
    note: str | None = None

    model_config = {"from_attributes": True}


# 「從歷史選擇」picker 用的清單項目——依 food_name 彙整過去所有飲食記錄裡
# 出現過的品項，不是單筆原始紀錄。portion_grams/calories 是「最近一次」吃這個
# 食材時的份量/熱量，picker 選取後拿來當預設值，使用者還是可以再自己調整
class HistoryFoodItemOut(BaseModel):
    food_name: str
    image_url: str | None = None
    portion_grams: float
    calories: float
    times_used: int
    last_used_at: datetime
