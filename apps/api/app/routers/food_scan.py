import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from openai import OpenAI, OpenAIError, RateLimitError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.food_scan import FoodScanLog
from app.models.pet import Pet
from app.models.user import User
from app.schemas.food_scan import (
    AnalyzeFoodRequest,
    AnalyzeFoodResponse,
    FoodScanHistoryItemOut,
    FoodScanUsageOut,
)

router = APIRouter(prefix="/food-scan", tags=["food-scan"])
settings = get_settings()
logger = logging.getLogger("uvicorn.error")

DISCLAIMER = "此分析僅供參考，非專業營養或獸醫建議，不確定是否安全的食物請諮詢獸醫後再餵食。"

# 食物辨識跟寵物症狀辨識（app/routers/ai_scan.py）是各自獨立的每日額度，
# 分開算才不會互相排擠——常常拍食物的人不一定常常需要症狀診斷，反之亦然
DAILY_LIMIT = 10

# 明確要求模型只回傳固定格式的 JSON，才能穩定 parse；特別強調狗貓對很多人類
# 食物的耐受度跟人類不一樣（巧克力、葡萄、洋蔥、木糖醇等對牠們是有毒的），
# 這是這支功能最重要的判斷依據。
#
# 熱量/營養資訊改成直接估「照片裡這一份的總量」，不是每 100g 的密度——
# 使用者身邊通常沒有秤，沒辦法先秤重再回頭查密度換算，直接問 AI「這份大概
# 幾公克、大概幾大卡」才是使用者真正能用的答案。
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會判斷使用者上傳的食物照片是否適合餵給狗或貓，並"
    "直接估計照片中「這一份」食物的總重量與對應的營養資訊。使用者身邊通常沒有"
    "秤，沒辦法秤重後再回報，所以請你根據照片裡的份量大小直接目測估計總重量"
    "（可以參考照片中常見的參照物比例，例如餐盤、湯匙、寵物碗、手掌等），"
    "不要用「每 100g」的密度回答，要直接給「這一份」的總量。狗和貓對很多"
    "人類食物的耐受度跟人類不一樣，有些食物對牠們是有毒的（例如巧克力、"
    "葡萄/葡萄乾、洋蔥/大蒜、木糖醇、酒精、咖啡因、夏威夷豆等），請根據你的"
    "知識謹慎判斷安全性，寧可保守也不要輕描淡寫。\n"
    "請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"food_detected": true/false, '
    '"food_name": "食物名稱（例如「雞胸肉 Chicken Breast」），food_detected 是 '
    'false 時給空字串", '
    '"confidence": 0-100 整數, '
    '"estimated_grams": 照片中「這一份」食物的總重量估計（數字，公克，'
    'food_detected 是 false 時給 0）, '
    '"calories": 這一份（依上面 estimated_grams 估計的總重量）的總熱量估計'
    "（數字，kcal，不是每 100g 密度）, "
    '"protein": 這一份的總蛋白質估計（公克）, '
    '"fat": 這一份的總脂肪估計（公克）, '
    '"carb": 這一份的總碳水化合物估計（公克）, '
    '"fiber": 這一份的總纖維估計（公克）, '
    '"safety_level": 1-5 整數（5 = 很安全，1 = 危險/有毒，food_detected 是 '
    'false 時給 0）, '
    '"is_safe": true/false, '
    '"suitable_species": ["dog", "cat"] 的子集合，這個食物適合餵的物種，可能是'
    "空陣列, "
    '"suggestions": ["建議或注意事項", ...]，最多 3 條，簡短的中文句子}\n'
    "如果照片裡看不出是食物（例如空盤子、包裝袋、不相關的東西），food_detected "
    "設 false，其他數值/陣列欄位給 0 或空陣列，不要瞎猜。份量估計不用非常"
    "精確，合理的目測估計即可，但一定要直接給總重量/總熱量，不要用每 100g"
    "密度回答。如果食物對狗或貓有毒/危險，safety_level 要低（1-2）、"
    "is_safe 設 false，suggestions 要清楚警告危險性。"
)


# 跟其他 router 的 _get_owned_pet 是同一套防線：確認這隻寵物真的屬於目前
# 登入的使用者，避免拿別人的 pet_id 亂打這支（會消耗 OpenAI 額度）
def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


# 「今天」用 UTC 當天 00:00 起算，不特別處理使用者所在時區——這支功能本身
# 就只是粗略的花費安全網，不需要跟使用者當地日期切齊那麼精確
def _count_today(db: Session, user_id: int) -> int:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (
        db.query(FoodScanLog)
        .filter(FoodScanLog.user_id == user_id, FoodScanLog.created_at >= today_start)
        .count()
    )


def _is_admin(user: User) -> bool:
    return user.permissions == "admin"


def _build_usage(db: Session, user: User) -> FoodScanUsageOut:
    used = _count_today(db, user.id)
    return FoodScanUsageOut(used=used, limit=DAILY_LIMIT, unlimited=_is_admin(user))


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


# 前端開啟 AI 食物辨別室的時候先打這支，用來顯示「今日已使用 X/10 次」的
# 標語，還沒上傳照片就能提早告知額度用完了
@router.get(
    "/usage-today",
    response_model=FoodScanUsageOut,
    status_code=status.HTTP_200_OK,
)
def get_usage_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _build_usage(db, current_user)


# 「檢視記錄」列表：某隻寵物過去的 AI 食物辨識紀錄，最新的排前面
@router.get(
    "/history/{pet_id}",
    response_model=list[FoodScanHistoryItemOut],
    status_code=status.HTTP_200_OK,
)
def get_history(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(FoodScanLog)
        .filter(FoodScanLog.pet_id == pet_id)
        .order_by(FoodScanLog.created_at.desc(), FoodScanLog.id.desc())
        .all()
    )


@router.post(
    "/analyze-image",
    response_model=AnalyzeFoodResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_food(
    payload: AnalyzeFoodRequest,
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
                detail=f"今天的 AI 食物辨識次數已用完（每天最多 {DAILY_LIMIT} 次），請明天再試",
            )

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="尚未設定 OPENAI_API_KEY，請在 .env 補上後重啟伺服器",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            max_tokens=500,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "請分析這張食物照片。"},
                        {
                            "type": "image_url",
                            "image_url": {"url": payload.image_url},
                        },
                    ],
                },
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
        logger.exception("OpenAI 食物分析失敗")
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

    food_detected = bool(parsed.get("food_detected", False))
    suitable_species = [
        s for s in (parsed.get("suitable_species") or []) if s in ("dog", "cat")
    ]
    suggestions = [str(s) for s in (parsed.get("suggestions") or [])][:5]

    try:
        confidence = _clamp(int(parsed.get("confidence", 0)), 0, 100)
        safety_level = _clamp(int(parsed.get("safety_level", 0)), 0, 5)
        estimated_grams = float(parsed.get("estimated_grams", 0) or 0)
        calories = float(parsed.get("calories", 0) or 0)
        protein = float(parsed.get("protein", 0) or 0)
        fat = float(parsed.get("fat", 0) or 0)
        carb = float(parsed.get("carb", 0) or 0)
        fiber = float(parsed.get("fiber", 0) or 0)
    except (TypeError, ValueError) as exc:
        logger.error("OpenAI 回傳數值格式錯誤：%s", raw)
        raise HTTPException(
            status_code=502, detail="AI 回傳格式錯誤，請稍後再試"
        ) from exc

    # 分析成功才算一次額度、也才存進紀錄——OpenAI 報錯、JSON parse 失敗這些
    # 情況都在上面提早 raise 掉了，不會走到這裡
    db.add(
        FoodScanLog(
            user_id=current_user.id,
            pet_id=payload.pet_id,
            image_url=payload.image_url,
            food_detected=food_detected,
            food_name=str(parsed.get("food_name", "")),
            confidence=confidence,
            estimated_grams=estimated_grams,
            calories=calories,
            protein=protein,
            fat=fat,
            carb=carb,
            fiber=fiber,
            safety_level=safety_level,
            is_safe=bool(parsed.get("is_safe", False)),
            suitable_species=suitable_species,
            suggestions=suggestions,
        )
    )
    db.commit()

    return AnalyzeFoodResponse(
        food_detected=food_detected,
        food_name=str(parsed.get("food_name", "")),
        confidence=confidence,
        estimated_grams=estimated_grams,
        calories=calories,
        protein=protein,
        fat=fat,
        carb=carb,
        fiber=fiber,
        safety_level=safety_level,
        is_safe=bool(parsed.get("is_safe", False)),
        suitable_species=suitable_species,
        suggestions=suggestions,
        disclaimer=DISCLAIMER,
        usage=_build_usage(db, current_user),
    )
