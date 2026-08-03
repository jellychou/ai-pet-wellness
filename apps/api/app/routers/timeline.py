from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.ai_scan import AiScanLog
from app.models.health_journal import HealthJournalLog
from app.models.pet import Pet
from app.models.report import ReportRecord
from app.models.user import User
from app.models.vaccine import VaccineRecord
from app.schemas.timeline import TimelineItemOut

router = APIRouter(prefix="/timeline", tags=["timeline"])

# 跟 data/pets.ts 的 ReportTypeEnum 保持一致——健康檢查紀錄的 report_type
# 只存代碼（"1".."6"），時間軸上要顯示人看得懂的標題，所以在這裡對照一份。
# 如果之後改了前端的分類文字，這邊也要跟著改
_REPORT_TYPE_LABELS: dict[str, str] = {
    "1": "年度健康檢查",
    "2": "血液檢查",
    "3": "糞便檢查",
    "4": "心臟檢查",
    "5": "超音波檢查",
    "6": "其他檢查",
}


# 找出「屬於這個使用者」的那隻寵物，找不到（包含 id 存在但是別人的）一律當 404，
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


# 把某隻寵物的疫苗紀錄、健康檢查紀錄依日期合併成一條時間軸。這裡不是另外存
# 一張表——每個功能的資料還是各自存在自己的 table，時間軸只是讀取時把它們
# 攤平、排序後回傳，避免同一份資料要維護兩個地方
@router.get(
    "/{pet_id}",
    response_model=list[TimelineItemOut],
    status_code=status.HTTP_200_OK,
)
def get_timeline(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)

    items: list[TimelineItemOut] = []

    # 只有「已接種」（vaccination_date 有值）的疫苗紀錄才算真的發生過的事件，
    # 待接種的還沒發生，不放進歷史時間軸
    vaccine_records = (
        db.query(VaccineRecord)
        .filter(
            VaccineRecord.pet_id == pet_id,
            VaccineRecord.vaccination_date.isnot(None),
        )
        .all()
    )
    for v in vaccine_records:
        items.append(
            TimelineItemOut(
                type="vaccine",
                id=v.id,
                date=v.vaccination_date,
                title=f"完成疫苗接種：{v.vaccine_name}",
                summary=v.hospital or v.vet,
            )
        )

    report_records = (
        db.query(ReportRecord).filter(ReportRecord.pet_id == pet_id).all()
    )
    for r in report_records:
        items.append(
            TimelineItemOut(
                type="report",
                id=r.id,
                date=r.report_date,
                title=_REPORT_TYPE_LABELS.get(r.report_type, "健康檢查紀錄"),
                summary=r.report_result,
            )
        )

    # 跟 vaccine/report 不一樣：不是每筆 AI 診斷紀錄都自動進時間軸，只挑
    # 使用者按過「加入健康時間軸」的（見 app/routers/ai_scan.py 的
    # add_to_timeline）——隨手拍的照片不一定值得留在時間軸上
    ai_scan_logs = (
        db.query(AiScanLog)
        .filter(AiScanLog.pet_id == pet_id, AiScanLog.added_to_timeline.is_(True))
        .all()
    )
    for a in ai_scan_logs:
        items.append(
            TimelineItemOut(
                type="ai_scan",
                id=a.id,
                date=a.created_at.date(),
                title=f"AI 影像分析：{a.body_part}" if a.body_part else "AI 影像分析",
                summary=a.summary,
            )
        )

    # 跟 ai_scan 一樣：不是每篇健康日誌都自動進時間軸，只挑使用者按過
    # 「加入健康日誌」的（見 app/routers/health_journal.py 的 add_to_timeline）
    health_journal_logs = (
        db.query(HealthJournalLog)
        .filter(
            HealthJournalLog.pet_id == pet_id,
            HealthJournalLog.added_to_timeline.is_(True),
        )
        .all()
    )
    for h in health_journal_logs:
        items.append(
            TimelineItemOut(
                type="health_journal",
                id=h.id,
                date=h.log_date,
                title=f"健康日誌：健康評分 {h.health_score}",
                summary=h.summary_points[0] if h.summary_points else None,
            )
        )

    items.sort(key=lambda item: item.date, reverse=True)
    return items
