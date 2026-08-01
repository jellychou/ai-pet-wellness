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
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會根據使用者上傳的寵物照片（例如皮膚、耳朵、眼睛、"
    "傷口等部位），描述你觀察到的異常特徵，並推測「可能」的健康狀況，附上大略的"
    "信心程度（0-100 的整數，不是精確機率）。你不是獸醫，不能做出確定診斷，只能"
    "提供初步觀察與推測。請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"summary": 兩到三句話的整體觀察摘要", '
    '"findings": [{"condition": "可能的狀況名稱", "confidence": 0-100 整數, '
    '"description": "簡短說明你為什麼這樣推測"}]}\n'
    '"suggestions": ["建議或注意事項", ...]，最多 3 條，簡短的中文句子，並分析實質建議，例如建議先觀察一天先給少量水或可以留意精神問題，如果沒有不舒服可以先採取什麼行動}\n'
    "findings 最多列出 3 個最相關的可能狀況，依信心程度高到低排序；如果照片看起來"
    "沒有明顯異常，findings 可以是空陣列，summary 誠實說明看起來正常即可，不要為了"
    "有內容而硬掰。suggestions 最多列出 3 條，簡短的中文句子，並分析實質建議，例如建議先觀察一天先給少量水或可以留意精神問題，如果沒有不舒服可以先採取什麼行動"
    '"disclaimer": "這分析僅供參考，非醫療診斷，正式判斷請以獸醫實際檢查為準。"'
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
                        {"type": "text", "text": "請分析這張寵物照片。"},
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

    # 分析成功才算一次額度、也才存進紀錄——OpenAI 報錯、JSON parse 失敗這些
    # 情況都在上面提早 raise 掉了，不會走到這裡，使用者不會因為失敗的請求
    # 被扣次數、也不會留下一筆沒有內容的紀錄
    db.add(
        AiScanLog(
            user_id=current_user.id,
            pet_id=payload.pet_id,
            image_url=payload.image_url,
            summary=str(parsed.get("summary", "")),
            findings=[f.model_dump() for f in findings],
        )
    )
    db.commit()

    return AnalyzeImageResponse(
        summary=str(parsed.get("summary", "")),
        findings=findings,
        disclaimer=DISCLAIMER,
        usage=_build_usage(db, current_user),
    )
