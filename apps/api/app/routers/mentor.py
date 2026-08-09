import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI, OpenAIError, RateLimitError
from sqlalchemy.orm import Session

from app.core.ai_language import language_directive
from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.mentor import MentorMessage, MentorSession
from app.models.pet import Pet
from app.models.user import User
from app.schemas.mentor import (
    MentorMessage as MentorMessageSchema,
    MentorRequest,
    MentorResponse,
    MentorUsageOut,
)

router = APIRouter(prefix="/mentor", tags=["mentor"])
settings = get_settings()
logger = logging.getLogger("uvicorn.error")

# 跟 ai_scan.py/health_journal.py 同樣的帳號層級花費控管，但這裡限制的是
# 「今天開了幾段新對話」，不是「今天講了幾句話」——同一段對話裡繼續追問
# 不應該被每日次數卡住，不然使用者聊到一半就被擋會很奇怪
DAILY_LIMIT = 5

MAX_TURNS_BEFORE_FORCE_FINISH = 6

SYSTEM_PROMPT = (
    "你是一位溫暖、不批判的寵物行為與情緒顧問，陪伴使用者一起了解毛孩最近"
    "的行為或情緒變化。你不是獸醫，不能做醫療診斷，如果使用者描述的狀況"
    "聽起來像是健康問題（例如疼痛、外傷、持續嘔吐/腹瀉），要建議去看獸醫，"
    "不要自己給醫療建議。\n"
    "對話規則：\n"
    "1. 一開始先簡短回應/摘要使用者提供的背景，然後問第一個具體問題。\n"
    "2. 每一輪如果還需要更多資訊才能給出結論，就繼續問「一個」具體問題，要更體貼主人心靈一點，因為這是心靈導師，"
    "所以不要直接問使用者，而是要更像是跟朋友聊天一樣，試著引導使用者說出更多資訊。"
    "同時給 3-4 個簡短（8 個字以內）的選項放進 quick_replies，讓使用者"
    "可以直接點選，不用自己打字。\n"
    "3. 最多問 3-4 輪就要收斂，不要無限問下去；如果使用者提供的資訊已經"
    "足夠（通常包含：行為/情緒的具體表現、發生的情境或時機、頻率或持續"
    "時間、最近有沒有環境或作息變化），就把 is_finished 設成 true。\n"
    "4. is_finished=true 時，quick_replies 留空陣列，summary_sections 要"
    "給 3-5 條具體的重點整理（分類呈現，例如身體/情緒狀態、習慣改變、"
    "獨處或特定情境下的反應），每條都要具體、跟這次對話內容有關，不要"
    "空泛地說「請多觀察」；message 欄位則是簡短的總結語跟鼓勵。\n"
    "5. is_finished=false 時，summary_sections 給空陣列。\n"
    "請只回傳一個 JSON 物件，格式如下，不要有其他文字：\n"
    '{"message": "這輪要顯示給使用者的一段話", '
    '"quick_replies": ["選項1", "選項2", ...], '
    '"is_finished": true 或 false, '
    '"summary_sections": ["重點1", "重點2", ...]}\n'
    "無論如何，你最後回覆的內容都必須「只有」那個 JSON 物件本身：不要加"
    "```json 或 ``` 這種 markdown 程式碼區塊包住它，前後也不要有任何"
    "說明文字或引言。"
)


def _get_owned_pet(db: Session, current_user: User, pet_id: int) -> Pet:
    pet = (
        db.query(Pet)
        .filter(Pet.id == pet_id, Pet.user_id == current_user.id)
        .first()
    )
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


def _get_owned_session(
    db: Session, current_user: User, session_id: int
) -> MentorSession:
    session = (
        db.query(MentorSession)
        .filter(
            MentorSession.id == session_id,
            MentorSession.user_id == current_user.id,
        )
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="找不到這段對話")
    return session


# 「今天」用 UTC 當天 00:00 起算，理由跟其他功能一樣：這只是粗略的花費
# 安全網，不需要跟使用者當地日期切齊那麼精確。這裡數的是「今天開了幾段
# 新對話」（mentor_sessions 的建立數），不是訊息數
def _count_today(db: Session, user_id: int) -> int:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (
        db.query(MentorSession)
        .filter(
            MentorSession.user_id == user_id,
            MentorSession.created_at >= today_start,
        )
        .count()
    )


def _is_admin(user: User) -> bool:
    return user.permissions == "admin"


def _build_usage(db: Session, user: User) -> MentorUsageOut:
    used = _count_today(db, user.id)
    return MentorUsageOut(used=used, limit=DAILY_LIMIT, unlimited=_is_admin(user))


def _to_openai_messages(system_content: str, history: list[MentorMessage]) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": system_content}]
    for m in history:
        if m.image_url:
            messages.append(
                {
                    "role": m.role,
                    "content": [
                        {"type": "text", "text": m.content or "（附上一張照片）"},
                        {"type": "image_url", "image_url": {"url": m.image_url}},
                    ],
                }
            )
        else:
            messages.append({"role": m.role, "content": m.content})
    return messages


@router.get(
    "/usage-today",
    response_model=MentorUsageOut,
    status_code=status.HTTP_200_OK,
)
def get_usage_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _build_usage(db, current_user)


@router.post(
    "/chat",
    response_model=MentorResponse,
    status_code=status.HTTP_200_OK,
)
def chat(
    payload: MentorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_pet(db, current_user, payload.pet_id)

    is_new_session = payload.mentor_session_id is None

    if is_new_session:
        # admin 帳號不受每日次數限制——見 app/models/user.py 的 permissions 欄位。
        # 限制的是「開新對話」的次數，不是每則訊息
        if not _is_admin(current_user):
            used = _count_today(db, current_user.id)
            if used >= DAILY_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"今天開啟 AI 心靈導師對話的次數已用完（每天最多 {DAILY_LIMIT} 次），請明天再試",
                )
        session = MentorSession(user_id=current_user.id, pet_id=payload.pet_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session = _get_owned_session(db, current_user, payload.mentor_session_id)
        if session.pet_id != payload.pet_id:
            raise HTTPException(status_code=404, detail="找不到這段對話")
        if session.is_finished:
            raise HTTPException(
                status_code=400, detail="這段對話已經結束，請開始新的一輪"
            )

    # 只有真的有話要說（文字或圖片）才存一筆使用者訊息——開新對話的第一次
    # 呼叫可能 content 是空的，純粹只是要 AI 主動開場，不用存一筆空白訊息
    if payload.content.strip() or payload.image_url:
        db.add(
            MentorMessage(
                session_id=session.id,
                role="user",
                content=payload.content.strip(),
                image_url=payload.image_url,
            )
        )
        db.commit()

    db.refresh(session)
    history = session.messages

    # 附加語言指示句，讓 message/quick_replies/summary_sections 這些自然
    # 語言欄位跟著使用者目前的 UI 語言走，不是永遠回中文——見
    # app/core/ai_language.py。這裡全部欄位都是自由文字，沒有像
    # health_journal.risk_level 那種要保留原格式的結構化欄位，不用 enum_note
    system_content = SYSTEM_PROMPT + language_directive(current_user.language)
    if payload.context and is_new_session:
        system_content += (
            "\n\n以下是這次對話一開始就知道的背景資訊，你的開場白要直接引用、"
            f"不用使用者重講一次：\n{payload.context}"
        )
    turn_count = sum(1 for m in history if m.role == "user")
    if turn_count >= MAX_TURNS_BEFORE_FORCE_FINISH:
        system_content += (
            "\n\n使用者已經回答了不少輪追問，這一輪無論資訊夠不夠，都請把"
            "is_finished 設成 true，用目前已知的資訊給出結論。"
        )

    openai_messages = _to_openai_messages(system_content, history)
    if not history:
        # 完全沒有訊息（開新對話、沒有 context 也沒有 content）——至少要有
        # 一則 user turn 讓模型有東西可以回應，塞一句通用的開場提示
        openai_messages.append({"role": "user", "content": "請開始今天的對話。"})

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="尚未設定 OPENAI_API_KEY，請在 .env 補上後重啟伺服器",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        completion = client.chat.completions.create(
            model=settings.openai_mentor_model,
            response_format={"type": "json_object"},
            max_completion_tokens=1000,
            reasoning_effort="low",
            messages=openai_messages,
        )
    except RateLimitError as exc:
        logger.exception("OpenAI 額度不足或超過速率限制")
        raise HTTPException(
            status_code=502,
            detail="OpenAI 帳號額度不足或已達速率限制，請至 "
            "platform.openai.com 檢查帳單與額度設定",
        ) from exc
    except OpenAIError as exc:
        logger.exception("OpenAI 心靈導師對話失敗")
        raise HTTPException(status_code=502, detail=f"AI 回覆失敗：{exc}") from exc

    raw = completion.choices[0].message.content
    try:
        parsed = json.loads(raw or "")
    except json.JSONDecodeError as exc:
        logger.error("OpenAI 回傳非預期格式：%s", raw)
        raise HTTPException(
            status_code=502, detail="AI 回傳格式錯誤，請稍後再試"
        ) from exc

    assistant_text = str(parsed.get("message", "") or "").strip()
    if not assistant_text:
        assistant_text = "抱歉，我剛剛沒有想清楚，可以再多說一點嗎？"

    is_finished = bool(parsed.get("is_finished", False))

    raw_quick_replies = parsed.get("quick_replies")
    quick_replies = (
        [str(q) for q in raw_quick_replies][:4]
        if isinstance(raw_quick_replies, list)
        else []
    )

    raw_summary = parsed.get("summary_sections")
    summary_sections = (
        [str(s) for s in raw_summary][:5] if isinstance(raw_summary, list) else []
    )

    assistant_msg = MentorMessage(
        session_id=session.id, role="assistant", content=assistant_text
    )
    db.add(assistant_msg)

    if is_finished:
        session.is_finished = True
        session.summary_sections = summary_sections

    db.commit()
    db.refresh(assistant_msg)
    db.refresh(session)

    return MentorResponse(
        id=session.id,
        is_finished=session.is_finished,
        message=MentorMessageSchema(role="assistant", content=assistant_text),
        created_at=assistant_msg.created_at,
        summary_sections=session.summary_sections if session.is_finished else None,
        quick_replies=quick_replies if not session.is_finished else None,
        usage=_build_usage(db, current_user),
    )
