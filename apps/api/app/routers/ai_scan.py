import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI, OpenAIError, RateLimitError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.pet import Pet
from app.models.user import User
from app.schemas.ai_scan import (
    AiScanFinding,
    AnalyzeImageRequest,
    AnalyzeImageResponse,
)

router = APIRouter(prefix="/ai-scan", tags=["ai-scan"])
settings = get_settings()
logger = logging.getLogger("uvicorn.error")

DISCLAIMER = "此分析僅供參考，非醫療診斷，正式判斷請以獸醫實際檢查為準。"

# 明確要求模型只回傳固定格式的 JSON，才能穩定 parse；同時把「不是獸醫、
# 不能下確定診斷」寫進 system prompt，降低模型自己講得太篤定的機率
SYSTEM_PROMPT = (
    "你是協助寵物照護的助理，會根據使用者上傳的寵物照片（例如皮膚、耳朵、眼睛、"
    "傷口等部位），描述你觀察到的異常特徵，並推測「可能」的健康狀況，附上大略的"
    "信心程度（0-100 的整數，不是精確機率）。你不是獸醫，不能做出確定診斷，只能"
    "提供初步觀察與推測。請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"summary": "一到兩句話的整體觀察摘要", '
    '"findings": [{"condition": "可能的狀況名稱", "confidence": 0-100 整數, '
    '"description": "簡短說明你為什麼這樣推測"}]}\n'
    "findings 最多列出 3 個最相關的可能狀況，依信心程度高到低排序；如果照片看起來"
    "沒有明顯異常，findings 可以是空陣列，summary 誠實說明看起來正常即可，不要為了"
    "有內容而硬掰。"
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

    return AnalyzeImageResponse(
        summary=str(parsed.get("summary", "")),
        findings=findings,
        disclaimer=DISCLAIMER,
    )
