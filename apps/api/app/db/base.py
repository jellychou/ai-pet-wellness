from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """所有 ORM model 的共用基底類別。

    新增 model 時記得在 app/models/__init__.py 裡 import，
    這樣 Alembic 的 autogenerate 才抓得到。
    """
