from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.pet import Pet
from app.models.report import ReportRecord
from app.models.user import User
from app.schemas.report import (
    AddReportRecordRequest,
    ReportRecordOut,
    UpdateReportRecordRequest,
)

router = APIRouter(prefix="/report", tags=["report"])


# 找出「屬於這個使用者」的那隻寵物，找不到（包含 id 存在但是別人的）一律當 404，
# 跟 pet.py / vaccine.py 用的是同一套防線
def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 找出「屬於這個使用者的寵物」底下的那筆健康檢查紀錄
def _get_owned_report_record(
    db: Session, current_user: User, record_id: int
) -> ReportRecord:
    record = (
        db.query(ReportRecord)
        .join(Pet, ReportRecord.pet_id == Pet.id)
        .filter(ReportRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Report record not found")
    return record


# 取得某隻寵物的所有健康檢查紀錄，最新的排前面
@router.get(
    "/report-records/{pet_id}",
    response_model=list[ReportRecordOut],
    status_code=status.HTTP_200_OK,
)
def get_reports(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(ReportRecord)
        .filter(ReportRecord.pet_id == pet_id)
        .order_by(ReportRecord.report_date.desc())
        .all()
    )


# 新增一筆健康檢查紀錄
@router.post(
    "/add-report-record",
    response_model=ReportRecordOut,
    status_code=status.HTTP_201_CREATED,
)
def add_report_record(
    payload: AddReportRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, payload.pet_id)
    new_record = ReportRecord(**payload.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


# 更新一筆健康檢查紀錄
@router.put(
    "/update-report-record",
    response_model=ReportRecordOut,
    status_code=status.HTTP_200_OK,
)
def update_report_record(
    payload: UpdateReportRecordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = _get_owned_report_record(db, current_user, payload.id)
    for field, value in payload.model_dump(exclude={"id"}).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


# 刪除一筆健康檢查紀錄
@router.delete("/delete-report-record/{record_id}", status_code=status.HTTP_200_OK)
def delete_report_record(
    record_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = _get_owned_report_record(db, current_user, record_id)
    db.delete(record)
    db.commit()
    return {"message": "Report record deleted successfully"}
