# 在這裡 import 所有 model，讓 Alembic autogenerate 能偵測到 table。
from app.models.user import User
from app.models.pet import Pet
from app.models.vaccine import VaccineRecord
from app.models.report import ReportRecord
from app.models.ai_scan import AiScanLog
from app.models.food_scan import FoodScanLog
from app.models.food_record import FoodRecord

__all__ = [
    "User",
    "Pet",
    "VaccineRecord",
    "ReportRecord",
    "AiScanLog",
    "FoodScanLog",
    "FoodRecord",
]
