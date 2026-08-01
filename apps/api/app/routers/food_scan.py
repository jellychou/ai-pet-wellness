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
    FoodScanItem,
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
# 熱量/營養資訊改成逐項食材/品項分解（干貝、蟹肉、燉飯...各自估重量範圍與
# 熱量範圍），不是整張照片一個籠統的食物名稱，也不是每 100g 的密度——
# 使用者身邊通常沒有秤，沒辦法先秤重再回頭查密度換算，直接看到「這道菜裡
# 大概有哪些東西、各自大概幾公克/幾大卡」才是使用者真正能用的分析。
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會判斷使用者上傳的食物照片是否適合餵給狗或貓。"
    "請逐項列出照片中你辨識到的每一種主要食材/品項，分別給每一項的重量範圍"
    "與熱量範圍估計，再加總成整份餐點的估計。使用者身邊通常沒有秤，沒辦法"
    "秤重後再回報，所以請直接根據照片內容（份量大小、常見容器/餐具/份數"
    "比例等）目測估計，每一項的重量跟熱量都給一個合理的範圍（low/high），"
    "不要用「每 100g」的密度回答。狗和貓對很多人類食物的耐受度跟人類不"
    "一樣，有些食物對牠們是有毒的（例如巧克力、葡萄/葡萄乾、洋蔥/大蒜、"
    "木糖醇、酒精、咖啡因、夏威夷豆等），請根據你的知識謹慎判斷安全性，"
    "寧可保守也不要輕描淡寫。\n"
    "請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"food_detected": true/false, '
    '"food_name": "整份餐點的簡短描述（例如「黑松露野菇燉飯套餐」），'
    'food_detected 是 false 時給空字串", '
    '"confidence": 0-100 整數, '
    '"items": [{"name": "食材/品項名稱（例如「黑松露野菇燉飯」「干貝 x2」）", '
    '"estimated_grams_low": 這項重量估計下限（數字，公克）, '
    '"estimated_grams_high": 這項重量估計上限（數字，公克）, '
    '"calories_low": 這項熱量估計下限（數字，kcal）, '
    '"calories_high": 這項熱量估計上限（數字，kcal）, '
    '"included": true/false（這項是否要計入整份餐點的總熱量，例如明顯沒'
    '吃完的配菜、純裝飾用的香草可以設 false）, '
    '"note": "簡短備註，例如「看起來沒有全部吃完，因此不計入」，沒有的話'
    '給空字串"}, ...]，最多列 8 項最主要的食材/品項，不要瑣碎到每一根蔥'
    "都列, "
    '"estimated_grams": 所有 included=true 品項加總的重量最佳估計'
    "（數字，公克，food_detected 是 false 時給 0）, "
    '"calories_low": 整份餐點總熱量估計下限（數字，kcal，加總所有 '
    'included 品項的 calories_low）, '
    '"calories_high": 整份餐點總熱量估計上限（數字，kcal，加總所有 '
    'included 品項的 calories_high）, '
    '"calories": 整份餐點總熱量的單一最佳估計（數字，kcal，落在 '
    "calories_low 到 calories_high 之間，依常見份量抓一個代表值）, "
    '"protein": 整份餐點總蛋白質最佳估計（公克）, '
    '"fat": 整份餐點總脂肪最佳估計（公克）, '
    '"carb": 整份餐點總碳水化合物最佳估計（公克）, '
    '"fiber": 整份餐點總纖維最佳估計（公克）, '
    '"estimate_note": "估算準確度的簡短說明，例如「只能做估算，無法僅靠'
    '照片精準得知重量、奶油、起司或油脂用量，因此誤差可能約 ±20~30%」", '
    '"safety_level": 1-5 整數（5 = 很安全，1 = 危險/有毒，food_detected 是 '
    'false 時給 0）, '
    '"is_safe": true/false, '
    '"suitable_species": ["dog", "cat"] 的子集合，這個食物適合餵的物種，可能是'
    "空陣列, "
    '"suggestions": ["建議或注意事項", ...]，最多 3 條，簡短的中文句子}\n'
    "如果照片裡看不出是食物（例如空盤子、包裝袋、不相關的東西），"
    "food_detected 設 false，items 給空陣列，其他數值/陣列欄位給 0 或空"
    "陣列，不要瞎猜。份量估計不用非常精確，合理的目測範圍即可，但一定要"
    "直接給重量/熱量的範圍，不要用每 100g 密度回答。如果食物對狗或貓有毒/"
    "危險，safety_level 要低（1-2）、is_safe 設 false，suggestions 要清楚"
    "警告危險性。"
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


# OpenAI 回傳的 JSON 是不可信輸入，items 陣列裡任何一項格式不對都不該讓整支
# API 500——單純跳過那一項，其他項目照常處理。最多留 8 項，跟 SYSTEM_PROMPT
# 裡要求的上限一致，防止異常大的陣列把 DB/前端畫面塞爆
def _parse_items(raw_items: object) -> list[FoodScanItem]:
    if not isinstance(raw_items, list):
        return []

    items: list[FoodScanItem] = []
    for entry in raw_items[:8]:
        if not isinstance(entry, dict):
            continue
        try:
            grams_low = max(0.0, float(entry.get("estimated_grams_low", 0) or 0))
            grams_high = max(0.0, float(entry.get("estimated_grams_high", 0) or 0))
            cal_low = max(0.0, float(entry.get("calories_low", 0) or 0))
            cal_high = max(0.0, float(entry.get("calories_high", 0) or 0))
        except (TypeError, ValueError):
            continue

        # 防呆：萬一 AI 把 low/high 反過來給，直接交換，不要讓畫面出現
        # "100-50g" 這種倒過來的範圍
        if grams_low > grams_high:
            grams_low, grams_high = grams_high, grams_low
        if cal_low > cal_high:
            cal_low, cal_high = cal_high, cal_low

        items.append(
            FoodScanItem(
                name=str(entry.get("name", "")).strip() or "未命名品項",
                estimated_grams_low=grams_low,
                estimated_grams_high=grams_high,
                calories_low=cal_low,
                calories_high=cal_high,
                included=bool(entry.get("included", True)),
                note=str(entry.get("note", "") or ""),
            )
        )
    return items


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
            # 逐項分解後回應變大很多（最多 8 個品項，每項好幾個欄位），
            # 500 tokens 的舊上限會把 items 陣列截斷成壞掉的 JSON
            max_tokens=1200,
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
    items = _parse_items(parsed.get("items"))
    estimate_note = str(parsed.get("estimate_note", "") or "")

    try:
        confidence = _clamp(int(parsed.get("confidence", 0)), 0, 100)
        safety_level = _clamp(int(parsed.get("safety_level", 0)), 0, 5)
        estimated_grams = float(parsed.get("estimated_grams", 0) or 0)
        calories_low = float(parsed.get("calories_low", 0) or 0)
        calories_high = float(parsed.get("calories_high", 0) or 0)
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

    if calories_low > calories_high:
        calories_low, calories_high = calories_high, calories_low

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
            items=[item.model_dump() for item in items],
            estimated_grams=estimated_grams,
            calories_low=calories_low,
            calories_high=calories_high,
            calories=calories,
            protein=protein,
            fat=fat,
            carb=carb,
            fiber=fiber,
            estimate_note=estimate_note,
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
        items=items,
        estimated_grams=estimated_grams,
        calories_low=calories_low,
        calories_high=calories_high,
        calories=calories,
        protein=protein,
        fat=fat,
        carb=carb,
        fiber=fiber,
        estimate_note=estimate_note,
        safety_level=safety_level,
        is_safe=bool(parsed.get("is_safe", False)),
        suitable_species=suitable_species,
        suggestions=suggestions,
        disclaimer=DISCLAIMER,
        usage=_build_usage(db, current_user),
    )
