import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from openai import OpenAI, OpenAIError, RateLimitError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.ai_scan import AiScanLog
from app.models.pet import Pet
from app.models.user import User
from app.schemas.ai_scan import (
    AddToTimelineResponse,
    AiScanFinding,
    AiScanHistoryItemOut,
    AiScanUsageOut,
    AnalyzeImageRequest,
    AnalyzeImageResponse,
)

router = APIRouter(prefix="/ai-scan", tags=["ai-scan"])
settings = get_settings()
logger = logging.getLogger("uvicorn.error")

DISCLAIMER = "此分析僅供參考，非醫療診斷，正式判斷請以獸醫實際檢查為準。"

# 一天最多打幾次 OpenAI 圖片分析——這是帳號層級的花費控管（每次呼叫都要
# 花 OpenAI 額度），不是資料庫效能考量，跟前面 billing/auto-reload 的討論
# 是同一個目的：避免異常用量把額度燒光
DAILY_LIMIT = 5

# 明確要求模型只回傳固定格式的 JSON，才能穩定 parse；同時把「不是獸醫、
# 不能下確定診斷」寫進 system prompt，降低模型自己講得太篤定的機率
#
# 這段之前被手動改壞過一次：JSON 範本裡漏了一個引號、大括號沒配對、
# suggestions/disclaimer 被寫在物件外面——模型收到這種自相矛盾的格式範例，
# 很容易回傳同樣壞掉的 JSON，導致 json.loads 直接丟 JSONDecodeError，
# 前端看到的就是分析失敗（502），感覺像「API 沒有回應」。這裡重寫成一個
# 完整、大括號有配對好的單一 JSON 物件範本。disclaimer 不需要模型自己生成
# （router 用固定的 DISCLAIMER 常數回傳，見下面 AnalyzeImageResponse），
# 所以範本裡不放這個欄位，避免模型自己編一個跟固定文案不一致的版本
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會根據使用者上傳的寵物照片（例如皮膚、耳朵、眼睛、"
    "傷口等部位），描述你觀察到的異常特徵，並推測「可能」的健康狀況，附上大略的"
    "信心程度（0-100 的整數，不是精確機率）。你不是獸醫，不能做出確定診斷，只能"
    "提供初步觀察與推測。請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"summary": "兩到三句話的整體觀察摘要", '
    '"findings": [{"condition": "可能的狀況名稱", "confidence": 0-100 整數, '
    '"description": "簡短說明你為什麼這樣推測"}], '
    '"suggestions": ["具體可執行的建議或注意事項", ...]}\n'
    "findings 最多列出 3 個最相關的可能狀況，依信心程度高到低排序；如果照片看起來"
    "沒有明顯異常，findings 可以是空陣列，summary 誠實說明看起來正常即可，不要為了"
    "有內容而硬掰。suggestions 最多列出 3 條簡短的中文句子，給實質可執行的建議"
    "（例如「先觀察一天，留意食慾和精神狀況」「可以先給予少量飲水，避免刺激患部」"
    "「若 24 小時內沒有改善或有惡化，建議儘快就醫」），不要只是空泛地說「請注意」。"
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
        db.query(AiScanLog)
        .filter(AiScanLog.user_id == user_id, AiScanLog.created_at >= today_start)
        .count()
    )


def _is_admin(user: User) -> bool:
    return user.permissions == "admin"


def _build_usage(db: Session, user: User) -> AiScanUsageOut:
    used = _count_today(db, user.id)
    return AiScanUsageOut(used=used, limit=DAILY_LIMIT, unlimited=_is_admin(user))


# 前端開啟 AI 拍照診斷室的時候先打這支，用來顯示「今日已使用 X/5 次」的
# 標語，還沒上傳照片就能提早告知額度用完了，不用等按下去才被 429 擋下來
@router.get(
    "/usage-today",
    response_model=AiScanUsageOut,
    status_code=status.HTTP_200_OK,
)
def get_usage_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _build_usage(db, current_user)


# 「檢視記錄」列表：某隻寵物過去的 AI 診斷紀錄，最新的排前面。跟其他
# xxx-records/{pet_id} 的寫法一致，一樣要先確認寵物屬於目前登入的使用者
@router.get(
    "/history/{pet_id}",
    response_model=list[AiScanHistoryItemOut],
    status_code=status.HTTP_200_OK,
)
def get_history(
    pet_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, pet_id)
    return (
        db.query(AiScanLog)
        .filter(AiScanLog.pet_id == pet_id)
        # created_at 精度不夠時（同一秒內連續呼叫兩次）光排這欄會不穩定，
        # id 是嚴格遞增的，加進來當第二排序鍵才能保證新的一定排前面
        .order_by(AiScanLog.created_at.desc(), AiScanLog.id.desc())
        .all()
    )


@router.post(
    "/analyze-image",
    response_model=AnalyzeImageResponse,
    status_code=status.HTTP_200_OK,
)
def analyze_image(
    payload: AnalyzeImageRequest,
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
                detail=f"今天的 AI 診斷次數已用完（每天最多 {DAILY_LIMIT} 次），請明天再試",
            )

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="尚未設定 OPENAI_API_KEY，請在 .env 補上後重啟伺服器",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    # 使用者選了部位/填了補充說明的話，一起附進送給 AI 的文字裡，讓分析更
    # 聚焦（例如指定「腳掌」，AI 就不會把整張照片其他地方的雜訊也當成觀察
    # 對象）。兩個都是選填，都沒填就維持原本單純「請分析這張寵物照片」的文字
    body_part = (payload.body_part or "").strip()
    description = (payload.description or "").strip()
    prompt_text = "請分析這張寵物照片。"
    if body_part:
        prompt_text += f" 使用者指定要分析的部位：{body_part}。"
    if description:
        prompt_text += f" 使用者補充說明：{description}"

    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            # gpt-5.6-terra 是推理模型，max_tokens 已被 max_completion_tokens
            # 取代（隱藏的思考 token 也算在這個上限裡，同 food_scan.py 的說明）。
            # reasoning_effort 設 low：症狀初步判斷不需要深度推理，且上限
            # 從 500 調高到 900，避免思考 token 把實際 JSON 輸出擠爆截斷
            max_completion_tokens=900,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {
                            "type": "image_url",
                            "image_url": {"url": payload.image_url},
                        },
                    ],
                },
            ],
        )
    except RateLimitError as exc:
        # 最常見原因不是真的「太多請求」，而是這組 API key 所屬帳號沒有可用額度
        # （insufficient_quota）——新申請的 OpenAI 帳號即使 key 是對的，沒去
        # platform.openai.com 加 billing / 加值，一樣打不動任何請求
        logger.exception("OpenAI 額度不足或超過速率限制")
        raise HTTPException(
            status_code=502,
            detail="OpenAI 帳號額度不足或已達速率限制，請至 "
            "platform.openai.com 檢查帳單與額度設定",
        ) from exc
    except OpenAIError as exc:
        logger.exception("OpenAI 圖片分析失敗")
        # 把 OpenAI 回傳的錯誤原因一起帶出來方便排查（常見是 API key 無效、
        # 或圖片網址抓不到）。OpenAI 的錯誤訊息本身不會外洩完整 API key。
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

    findings = [
        AiScanFinding(
            condition=str(f.get("condition", "")),
            confidence=int(f.get("confidence", 0)),
            description=str(f.get("description", "")),
        )
        for f in parsed.get("findings", [])
    ]
    # 跟 food_scan.py 的 suggestions 一樣防呆：不是 list 就當空陣列，
    # 每一條轉成字串，最多留 3 條（跟 SYSTEM_PROMPT 裡要求的上限一致）
    raw_suggestions = parsed.get("suggestions")
    suggestions = (
        [str(s) for s in raw_suggestions][:3]
        if isinstance(raw_suggestions, list)
        else []
    )

    # 分析成功才算一次額度、也才存進紀錄——OpenAI 報錯、JSON parse 失敗這些
    # 情況都在上面提早 raise 掉了，不會走到這裡，使用者不會因為失敗的請求
    # 被扣次數、也不會留下一筆沒有內容的紀錄
    log = AiScanLog(
        user_id=current_user.id,
        pet_id=payload.pet_id,
        image_url=payload.image_url,
        body_part=body_part or None,
        user_note=description or None,
        summary=str(parsed.get("summary", "")),
        findings=[f.model_dump() for f in findings],
        suggestions=suggestions,
        # 明確傳 False，不要只靠 server_default——跟 food_scan.py 的
        # is_safe/food_detected 是同樣的做法。server_default 只是給既有
        # 資料/未來手動 insert 的保底值，程式碼路徑上該明確給值就不要偷懶
        added_to_timeline=False,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return AnalyzeImageResponse(
        id=log.id,
        body_part=log.body_part,
        summary=str(parsed.get("summary", "")),
        findings=findings,
        suggestions=suggestions,
        disclaimer=DISCLAIMER,
        usage=_build_usage(db, current_user),
    )


# 「加入健康時間軸」——不是每次分析都自動變成時間軸事件，使用者按了才算數。
# 沒有 request body：只認路徑上的 scan id，pet_id 從這筆紀錄反查，同時當作
# 擁有權檢查（跟 _get_owned_pet 一樣的防線，只是反過來從 log 找 pet）。
# 用 PUT 不用 POST 是因為這是「把某個資源的狀態改成 true」的語意，且重複呼叫
# 結果一樣（idempotent），已經加過的話直接回傳現況，不當成錯誤
@router.put(
    "/{scan_id}/add-to-timeline",
    response_model=AddToTimelineResponse,
    status_code=status.HTTP_200_OK,
)
def add_to_timeline(
    scan_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(AiScanLog)
        .filter(AiScanLog.id == scan_id, AiScanLog.user_id == current_user.id)
        .first()
    )
    if log is None:
        raise HTTPException(status_code=404, detail="找不到這筆分析紀錄")

    if not log.added_to_timeline:
        log.added_to_timeline = True
        db.commit()
        db.refresh(log)

    return AddToTimelineResponse(id=log.id, added_to_timeline=log.added_to_timeline)
