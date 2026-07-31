from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.pet import Pet
from app.db.session import get_db
from app.models.report import ReportRecord, AddReportRecordRequest, ReportRecordOut
from app.core.security import get_current_user

router = APIRouter(prefix="/report", tags=["report"])


def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


def _get_owned_report_record(db: Session, current_user: User, record_id: int) -> ReportRecord:
    record = (
        db.query(ReportRecord)
        .join(Pet, ReportRecord.pet_id == Pet.id)
        .filter(ReportRecord.id == record_id, Pet.user_id == current_user.id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Report record not found")
    return record

# 取得所有健康檢查紀錄
@router.get("/report-records")
def get_report(pet_id: int = Path(gt=0), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  _get_owned_pet(db, current_user, pet_id)
  records = (
    db.query(ReportRecord)
    .join(Pet, ReportRecord.pet_id == Pet.id)
    .filter(Pet.user_id == current_user.id, ReportRecord.pet_id == pet_id)
    .all()
  )
  if records is None:
    raise HTTPException(status_code=404, detail="Report records not found")
  return records


# 新增健康檢查紀錄
@router.post("/add-report-record", response_model=ReportRecordOut)
def add_report_record(payload: AddReportRecordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  _get_owned_pet(db, current_user, payload.pet_id)
  new_record = ReportRecord(**payload.model_dump())
  db.add(new_record)
  db.commit()
  db.refresh(new_record)
  return new_record



# 刪除健康檢查紀錄

@router.delete("/delete-report-record/{record_id}", response_model=ReportRecordOut)
def delete_report_record(record_id: int = Path(gt=0), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
  _get_owned_report_record(db, current_user, record_id)
  record = db.query(ReportRecord).filter(ReportRecord.id == record_id).first()
  db.delete(record)
  db.commit()
  return record