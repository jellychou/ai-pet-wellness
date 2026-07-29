# 在這裡 import 所有 model，讓 Alembic autogenerate 能偵測到 table。
from app.models.user import User

__all__ = ["User"]
