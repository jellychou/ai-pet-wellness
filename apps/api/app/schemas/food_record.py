from datetime import datetime
from typing import Literal

from pydantic import BaseModel

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


class AddFoodRecordRequest(BaseModel):
    pet_id: int
    food_name: str
    image_url: str | None = None
    portion_grams: float
    # 前端算好「這一份」的總熱量（calories_per_100g * portion_grams / 100）
    # 再送過來，後端只負責存，不重新計算
    calories: float
    meal_type: MealType
    fed_at: datetime
    note: str | None = None


class FoodRecordOut(BaseModel):
    id: int
    pet_id: int
    food_name: str
    image_url: str | None = None
    portion_grams: float
    calories: float
    meal_type: MealType
    fed_at: datetime
    note: str | None = None

    model_config = {"from_attributes": True}
