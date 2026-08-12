from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.ai_scan import AiScanLog
from app.models.food_record import FoodRecord
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

# 跟 AddHealthRecordDrawer.tsx 的 summaries 保持一致——體溫/心跳都缺的時候
# 拿這個當時間軸摘要的退路，不要直接顯示 "1" 這種代碼給使用者看
_REPORT_RESULT_LABELS: dict[str, str] = {
    "1": "狀況正常",
    "2": "建議觀察",
    "3": "數值異常",
}

# 跟 AddFoodRecordDrawer.tsx 的 mealTypeOptions 保持一致
_MEAL_TYPE_LABELS: dict[str, str] = {
    "breakfast": "早餐",
    "lunch": "午餐",
    "dinner": "晚餐",
    "snack": "點心",
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
    # 待接種的還沒發生，不放進歷史時間軸；只存日期沒存時間，time 留 None
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

    # 同樣只存日期，time 留 None；summary 改成帶體溫/心跳，時間軸卡片上比
    # report_result 那個簡短分類文字更有資訊量
    report_records = (
        db.query(ReportRecord).filter(ReportRecord.pet_id == pet_id).all()
    )
    for r in report_records:
        # 體溫/心跳現在是選填欄位，可能是 None——沒量到就不要硬湊一句
        # "體溫 None°C" 出來，兩個都缺就退回用 report_result 當摘要
        vitals_parts = []
        if r.report_temperature is not None:
            vitals_parts.append(f"體溫 {r.report_temperature}°C")
        if r.report_heart_rate is not None:
            vitals_parts.append(f"心跳 {r.report_heart_rate} bpm")
        items.append(
            TimelineItemOut(
                type="report",
                id=r.id,
                date=r.report_date,
                title=_REPORT_TYPE_LABELS.get(r.report_type, "健康檢查紀錄"),
                summary="，".join(vitals_parts)
                or _REPORT_RESULT_LABELS.get(r.report_result, r.report_result),
            )
        )

    # 飲食記錄無條件全撈——跟 vaccine/report 一樣，記錄下去就是真的吃過，
    # 不像 ai_scan/health_journal 有「要不要加入時間軸」這道額外確認。
    # fed_at 是真的存了時間的 datetime 欄位，time 給實際值；summary 把底下
    # 每個品項的名字/份量列出來，image_url 用第一個品項的縮圖（可能是這次
    # 拍照辨識的、也可能是「從歷史選擇」沿用的舊縮圖）
    food_records = (
        db.query(FoodRecord).filter(FoodRecord.pet_id == pet_id).all()
    )
    for f in food_records:
        item_texts = [f"{i.food_name} {round(i.portion_grams)}g" for i in f.items]
        first_image = next((i.image_url for i in f.items if i.image_url), None)
        items.append(
            TimelineItemOut(
                type="food",
                id=f.id,
                date=f.fed_at.date(),
                time=f.fed_at.strftime("%H:%M"),
                title=_MEAL_TYPE_LABELS.get(f.meal_type, "飲食記錄"),
                summary="、".join(item_texts) if item_texts else None,
                image_url=first_image,
            )
        )

    # 跟 vaccine/report 不一樣：不是每筆 AI 診斷紀錄都自動進時間軸，只挑
    # 使用者按過「加入時間軸」的（見 app/routers/ai_scan.py 的
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
                time=a.created_at.strftime("%H:%M"),
                title=f"AI 影像分析：{a.body_part}" if a.body_part else "AI 影像分析",
                summary=a.summary,
                image_url=a.image_url,
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
        # summary 優先顯示使用者自己寫的日誌文字（比較像「心情日記」的語氣），
        # 沒寫的話才退回 AI 摘要的第一條重點
        fallback_summary = h.summary_points[0] if h.summary_points else None
        items.append(
            TimelineItemOut(
                type="health_journal",
                id=h.id,
                date=h.log_date,
                title=f"健康日誌：健康評分 {h.health_score}",
                summary=(h.diary_text or "").strip() or fallback_summary,
            )
        )

    items.sort(key=lambda item: item.date, reverse=True)
    return items
