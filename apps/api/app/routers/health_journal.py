import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from openai import OpenAI, OpenAIError, RateLimitError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.health_journal import HealthJournalLog
from app.models.pet import Pet
from app.models.user import User
from app.schemas.health_journal import (
    AddToTimelineResponse,
    AnalyzeJournalRequest,
    AnalyzeJournalResponse,
    HealthJournalHistoryItemOut,
    HealthJournalUsageOut,
    JournalRecommendations,
)

router = APIRouter(prefix="/health-journal", tags=["health-journal"])
settings = get_settings()
logger = logging.getLogger("uvicorn.error")

DISCLAIMER = "此評分僅供參考，非醫療診斷，如有持續異常請諮詢獸醫。"

# 跟 ai_scan.py 同樣的帳號層級花費控管，每天最多打幾次 OpenAI 分析
DAILY_LIMIT = 5

# 明確要求模型只回傳固定格式的 JSON，才能穩定 parse；同時把「不是獸醫、
# 不能下確定診斷」寫進 system prompt，跟 ai_scan.py/food_scan.py 是同樣的
# 防呆做法
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會根據使用者每天記錄的寵物狀況（食慾、精神、"
    "活動量、排便、嘔吐、其他症狀、文字描述、照片），評估這隻寵物今天的"
    "整體健康狀況，給一個健康評分和風險等級，並提出具體建議。你不是獸醫，"
    "不能做確定診斷，只能根據記錄內容做初步的健康觀察與建議。請只回傳一個"
    "JSON 物件，格式如下，不要有其他文字：\n"
    '{"health_score": 0-100 的整數（100 表示狀況非常好，分數越低代表越'
    "需要留意；各項都正常的一天大致落在 75-90 之間，只有記錄裡真的出現"
    '異常時才給明顯偏低的分數，不要每天都給差不多的數字，要跟著記錄內容'
    '實際起伏）, '
    '"risk_level": "低" 或 "中" 或 "高"（風險等級，方向要跟 health_score '
    '一致，分數低風險等級就要偏高）, '
    '"summary_points": ["重點摘要，簡短的中文句子", ...]，最多 4 條，'
    "具體點出今天記錄裡哪些地方正常、哪些需要注意，不要空泛地說「整體"
    '正常」帶過, '
    '"recommendations": {'
    '"maintain": ["可以維持現狀的具體做法", ...]，最多 2 條, '
    '"watch": ["建議觀察的事項，通常是輕微異常但還不到需要就醫的程度", '
    '...]，最多 2 條, '
    '"concern": ["需要留意、可能要考慮就醫的警訊", ...]，如果今天沒有'
    "明顯警訊，這個陣列可以是空的，不要為了有內容硬掰}}\n"
    "食慾/精神/活動量/排便/嘔吐這幾項只要有任何一項明顯異常（例如嘔吐"
    "多次、腹瀉、食慾不好且精神偏差同時出現），health_score 就應該明顯"
    "下降、risk_level 要提高，concern 陣列要給出具體警訊；如果照片或"
    "文字日誌裡有額外透露的異常（例如照片看起來排泄物不正常、文字提到"
    "持續好幾天的狀況），也要納入評分考量，不要只看勾選欄位。\n"
    "無論有沒有附照片，你最後回覆使用者的訊息都必須「只有」那個 JSON 物件"
    "本身：不要加 ```json 或 ``` 這種 markdown 程式碼區塊包住它，前後也"
    "不要有任何說明文字或引言。"
)


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


# 「今天」用 UTC 當天 00:00 起算，理由跟 ai_scan.py/food_scan.py 一樣：
# 這只是粗略的花費安全網，不需要跟使用者當地日期切齊那麼精確
def _count_today(db: Session, user_id: int) -> int:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (
        db.query(HealthJournalLog)
        .filter(
            HealthJournalLog.user_id == user_id,
            HealthJournalLog.created_at >= today_start,
        )
        .count()
    )


def _is_admin(user: User) -> bool:
    return user.permissions == "admin"


def _build_usage(db: Session, user: User) -> HealthJournalUsageOut:
    used = _count_today(db, user.id)
    return HealthJournalUsageOut(
        used=used, limit=DAILY_LIMIT, unlimited=_is_admin(user)
    )


def _build_prompt_text(payload: AnalyzeJournalRequest) -> str:
    lines = [
        "請根據以下寵物今日的健康日誌內容，評估整體健康狀況。",
        f"日期：{payload.log_date.isoformat()}",
        f"食慾：{payload.appetite}",
        f"精神：{payload.energy}",
        f"活動量：{payload.activity_level}",
        f"排便：{payload.bowel_movement}",
        f"嘔吐：{payload.vomiting}",
    ]
    if payload.other_symptoms:
        lines.append(f"其他症狀：{'、'.join(payload.other_symptoms)}")
    else:
        lines.append("其他症狀：無")
    if payload.tags:
        lines.append(f"使用者標記的觀察重點：{'、'.join(payload.tags)}")
    diary_text = (payload.diary_text or "").strip()
    if diary_text:
        lines.append(f"使用者文字日誌：{diary_text}")
    if payload.photo_urls:
        lines.append(
            f"另外附上 {len(payload.photo_urls)} 張今日拍攝的照片"
            "（例如排泄物、食物、皮膚等），請一併納入判斷。"
        )
    return "\n".join(lines)


# 前端開啟健康日誌畫面時先打這支，用來顯示「今日已使用 X/5 次」的標語
@router.get(
    "/usage-today",
    response_model=HealthJournalUsageOut,
    status_code=status.HTTP_200_OK,
)
def get_usage_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _build_usage(db, current_user)


# 「檢視記錄」列表：某隻寵物過去的健康日誌，最新的排前面
@router.get(
    "/history/{pet_id}",
    response_model=list[HealthJournalHistoryItemOut],
    status_code=status.HTTP_200_OK,
)
def get_history(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(HealthJournalLog)
        .filter(HealthJournalLog.pet_id == pet_id)
        .order_by(HealthJournalLog.log_date.desc(), HealthJournalLog.id.desc())
        .all()
    )


@router.post(
    "/analyze",
    response_model=AnalyzeJournalResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_journal(
    payload: AnalyzeJournalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, payload.pet_id)

    # admin 帳號不受每日次數限制——見 app/models/user.py 的 permissions 欄位
    if not _is_admin(current_user):
        used = _count_today(db, current_user.id)
        if used >= DAILY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"今天的 AI 健康日誌分析次數已用完（每天最多 {DAILY_LIMIT} 次），請明天再試",
            )

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="尚未設定 OPENAI_API_KEY，請在 .env 補上後重啟伺服器",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    prompt_text = _build_prompt_text(payload)
    # 逐張把照片附進同一則訊息的 content 陣列——跟 ai_scan.py 的單張圖片是
    # 同樣的 image_url 格式，只是這裡可能有多張，全部塞進同一次分析裡讓
    # AI 一起判斷，不用像 food_scan 那樣每張各自分析
    content: list[dict] = [{"type": "text", "text": prompt_text}]
    for url in payload.photo_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})

    try:
        completion = client.chat.completions.create(
            model=settings.openai_health_journal_model,
            response_format={"type": "json_object"},
            # 推理模型：max_tokens 已被 max_completion_tokens 取代，理由跟
            # ai_scan.py 一樣。輸出欄位比 ai_scan 多（summary_points 最多
            # 4 條 + 三組建議），上限抓寬一點避免被截斷
            max_completion_tokens=1200,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
        )
    except RateLimitError as exc:
        logger.exception("OpenAI 額度不足或超過速率限制")
        raise HTTPException(
            status_code=502,
            detail="OpenAI 帳號額度不足或已達速率限制，請至 "
            "platform.openai.com 檢查帳單與額度設定",
        ) from exc
    except OpenAIError as exc:
        logger.exception("OpenAI 健康日誌分析失敗")
        raise HTTPException(
            status_code=502, detail=f"AI 分析失敗：{exc}"
        ) from exc

    raw = completion.choices[0].message.content
    try:
        parsed = json.loads(raw or "")
    except json.JSONDecodeError as exc:
        logger.error("OpenAI 回傳非預期格式：%s", raw)
        raise HTTPException(
            status_code=502, detail="AI 回傳格式錯誤，請稍後再試"
        ) from exc

    def _clamp(value: int, lo: int, hi: int) -> int:
        return max(lo, min(hi, value))

    try:
        health_score = _clamp(int(parsed.get("health_score", 0)), 0, 100)
    except (TypeError, ValueError):
        health_score = 0

    risk_level = str(parsed.get("risk_level", "") or "")
    if risk_level not in ("低", "中", "高"):
        # AI 沒照格式回，寧可用分數自己推一個保守的等級，也不要讓
        # response_model 驗證直接炸掉整支 API
        risk_level = "高" if health_score < 50 else "中" if health_score < 75 else "低"

    raw_summary = parsed.get("summary_points")
    summary_points = (
        [str(s) for s in raw_summary][:4] if isinstance(raw_summary, list) else []
    )

    raw_recs = parsed.get("recommendations")
    raw_recs = raw_recs if isinstance(raw_recs, dict) else {}

    def _rec_list(key: str, limit: int) -> list[str]:
        value = raw_recs.get(key)
        return [str(s) for s in value][:limit] if isinstance(value, list) else []

    recommendations = JournalRecommendations(
        maintain=_rec_list("maintain", 2),
        watch=_rec_list("watch", 2),
        concern=_rec_list("concern", 3),
    )

    # 跟前一篇（同一隻寵物、log_date 較早的最近一篇）比較健康評分，算出
    # 「較昨日 ↑/↓N 分」——沒有前一篇就是 None，前端不顯示這行
    previous = (
        db.query(HealthJournalLog)
        .filter(
            HealthJournalLog.pet_id == payload.pet_id,
            HealthJournalLog.log_date < payload.log_date,
        )
        .order_by(HealthJournalLog.log_date.desc(), HealthJournalLog.id.desc())
        .first()
    )
    score_delta = health_score - previous.health_score if previous else None

    # 分析成功才算一次額度、也才存進紀錄——理由跟 ai_scan.py/food_scan.py
    # 一樣：失敗的請求不該扣次數、也不該留下沒有內容的紀錄
    log = HealthJournalLog(
        user_id=current_user.id,
        pet_id=payload.pet_id,
        log_date=payload.log_date,
        appetite=payload.appetite,
        energy=payload.energy,
        activity_level=payload.activity_level,
        bowel_movement=payload.bowel_movement,
        vomiting=payload.vomiting,
        other_symptoms=payload.other_symptoms,
        diary_text=payload.diary_text,
        photo_urls=payload.photo_urls,
        tags=payload.tags,
        health_score=health_score,
        risk_level=risk_level,
        summary_points=summary_points,
        recommendations=recommendations.model_dump(),
        added_to_timeline=False,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return AnalyzeJournalResponse(
        id=log.id,
        log_date=log.log_date,
        health_score=health_score,
        score_delta=score_delta,
        risk_level=risk_level,
        summary_points=summary_points,
        recommendations=recommendations,
        disclaimer=DISCLAIMER,
        usage=_build_usage(db, current_user),
    )


# 「加入健康日誌」——不是每次分析都自動變成時間軸事件，使用者按了才算數，
# 跟 ai_scan.py 的 add_to_timeline 是同一套邏輯
@router.put(
    "/{log_id}/add-to-timeline",
    response_model=AddToTimelineResponse,
    status_code=status.HTTP_200_OK,
)
def add_to_timeline(
    log_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(HealthJournalLog)
        .filter(
            HealthJournalLog.id == log_id,
            HealthJournalLog.user_id == current_user.id,
        )
        .first()
    )
    if log is None:
        raise HTTPException(status_code=404, detail="找不到這筆日誌紀錄")

    if not log.added_to_timeline:
        log.added_to_timeline = True
        db.commit()
        db.refresh(log)

    return AddToTimelineResponse(id=log.id, added_to_timeline=log.added_to_timeline)
