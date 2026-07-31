# 在這裡 import 所有 model，讓 Alembic autogenerate 能偵測到 table。
from app.models.user import User
from app.models.pet import Pet
from app.models.vaccine import VaccineRecord

__all__ = ["User", "Pet", "VaccineRecord"]
