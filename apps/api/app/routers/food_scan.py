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
    "在你判斷 food_detected 是 true 還是 false 之前，如果照片中的物體形狀"
    "不常見（例如寵物潔牙骨、造型零食、壓製成特殊形狀的肉乾）、外表印有"
    "品牌名稱、包裝上有文字或商標、或是你單靠訓練知識無法確定這是什麼、"
    "是不是能吃的東西，請先使用網路搜尋工具查詢確認（例如搜尋你在照片上"
    "看到的品牌名稱、包裝文字），不要只因為形狀或顏色看起來不像傳統食物"
    "就直接判定 food_detected 是 false——寵物的潔牙骨、咬骨、零食棒等"
    "外觀往往跟人類食物差很多，但仍然是要餵給寵物吃的東西，算 food_detected"
    "是 true。只有真的是空盤子、包裝袋本身、玩具、餐具、或其他明顯不是"
    "食物/零食的東西，才設 food_detected 為 false。\n"
    "food_detected 是 false 時，items 給空陣列，其他數值/陣列欄位給 0 或空"
    "陣列，不要瞎猜。份量估計不用非常精確，合理的目測範圍即可，但一定要"
    "直接給重量/熱量的範圍，不要用每 100g 密度回答。如果食物對狗或貓有毒/"
    "危險，safety_level 要低（1-2）、is_safe 設 false，suggestions 要清楚"
    "警告危險性。\n"
    "無論有沒有使用搜尋工具，你最後回覆使用者的訊息都必須「只有」那個 JSON "
    "物件本身：不要加 ```json 或 ``` 這種 markdown 程式碼區塊包住它，"
    "前後也不要有任何說明文字、引言或搜尋結果摘要，就算你查了資料，也只"
    "把查到的結論整理進 JSON 欄位裡，不要另外用文字描述查證過程。"
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


# 沒有 JSON mode 強制保證格式了（跟 web_search 工具衝突，見上面 analyze_food
# 裡的說明），模型偶爾還是會夾雜 ```json ... ``` 這種 markdown code fence，
# 或在 JSON 前後加幾句話——直接 json.loads 原始字串常常會失敗。這裡先試著
# 剝掉常見的 code fence 包裝，再不行就抓字串裡第一個 "{" 到最後一個 "}"
# 之間的內容再試一次，兩種都失敗才真的當作格式錯誤放棄
def _extract_json(raw: str) -> dict:
    text = raw.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    if text.startswith("```"):
        # 去掉開頭的 ``` 或 ```json，跟結尾的 ```
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text[: -len("```")]
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("no valid JSON object found", raw, 0)


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
        # 改用 Responses API（不是 Chat Completions）——原因是使用者反映
        # 比較少見/有品牌包裝的食物我們認不出來，但直接問 ChatGPT 網頁版
        # 卻可以，因為網頁版會上網搜尋。Chat Completions API 沒有內建工具，
        # 純粹只能靠模型自己的訓練知識目測猜；Responses API 可以掛
        # web_search 工具，讓模型「邊看照片邊視需要上網查」，跟 ChatGPT
        # 網頁版是同一套機制。tools 只是給模型「可以用」，實際會不會觸發
        # 搜尋由模型自己判斷（tool_choice 預設 auto），不是每次都會查、
        # 也不會每次都變慢。
        #
        # 對應的介面差異：
        # - system prompt 改用頂層 instructions，不是 messages 裡的
        #   {"role": "system"}
        # - 圖片改用 input_image + 純網址字串（不是 image_url: {"url": ...}
        #   這個巢狀物件）
        # - max_completion_tokens 改用 max_output_tokens；reasoning_effort
        #   改用巢狀的 reasoning={"effort": ...}——都是 reasoning 模型的
        #   隱藏思考 token 也算在這個上限裡。原本設 low，但實測發現遇到
        #   造型潔牙骨/零食這種需要「先看到包裝上的字→決定要不要搜尋→查
        #   完再回答」的多步驟情境，low 幾乎不會觸發搜尋，直接回報看不出
        #   是食物——effort 太低，agentic search 的深度不夠。改成 medium，
        #   讓模型更願意在不確定時真的去查，換取多花一點思考 token 跟時間
        # - 拿最終文字用 response.output_text（SDK 幫忙處理掉 reasoning/
        #   web_search_call 這些中間步驟的 output item，跟 chat completions
        #   的 completion.choices[0].message.content 是對應角色)
        #
        # 這裡刻意不帶 text={"format": {"type": "json_object"}}——實測發現
        # OpenAI 不允許 web_search 工具跟 JSON mode 同時使用（400 "Web
        # Search cannot be used with JSON mode"）。改成純靠 SYSTEM_PROMPT
        # 的文字指示要求輸出 JSON，parse 那段也跟著加防呆（見下面
        # _extract_json），沒有 JSON mode 強制保證格式，模型偶爾夾雜
        # markdown code fence 或前後贅字的機率變高
        response = client.responses.create(
            model=settings.openai_food_scan_model,
            instructions=SYSTEM_PROMPT,
            tools=[{"type": "web_search"}],
            reasoning={"effort": "medium"},
            # medium effort 會用掉更多隱藏思考 token，2000 的舊上限留給
            # 實際 JSON 輸出的空間會被壓縮，容易又出現 items 陣列被截斷的
            # 問題（之前遇過一次），所以上限也一併調高
            max_output_tokens=3000,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "請分析這張食物照片。"},
                        {
                            "type": "input_image",
                            "image_url": payload.image_url,
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

    raw = response.output_text
    try:
        parsed = _extract_json(raw or "")
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
