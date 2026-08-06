"""共用小工具：把 User.language（UI 語言偏好，"zh-TW" 或 "en"，見
app/models/user.py）轉成要求 AI 回覆對應語言的指示句，附加在各支呼叫 OpenAI
的 router（food_scan/ai_scan/health_journal/mentor）的 system prompt 尾端。

刻意不是把整份 system prompt 都準備中/英兩個版本——那些 prompt 本身在講的是
「怎麼判斷食物安全性」「怎麼問診」這類跟輸出語言無關的邏輯本體，硬翻成兩份
只會多一份以後要一直同步維護的重複內容，還容易兩份漂移不一致（改了中文版
忘記改英文版）。模型完全讀得懂中文指示、寫英文輸出，兩者不衝突，所以只在
prompt 尾端加一句話明確指定「最後 JSON 裡的文字內容要用什麼語言寫」就夠了。

User.language 目前的來源：註冊時前端帶 i18n.language 存進去（見
app/routers/auth.py），之後在設定頁切換語言時透過 PUT /user/update-language
同步更新（見 app/routers/user.py）。也可能是 None（Google 登入或更早期的
帳號），一律 fallback 回 "zh-TW"，跟前端 i18n/config.ts 的預設語言一致。
"""

SUPPORTED_LANGUAGES = ("zh-TW", "en")


def resolve_language(language: str | None) -> str:
    return language if language in SUPPORTED_LANGUAGES else "zh-TW"


def language_directive(language: str | None, *, enum_note: str | None = None) -> str:
    """回傳要附加在 system prompt 結尾的語言指示句。

    enum_note：有些欄位是結構化的固定值，不是給人看的自然語言敘述（例如
    health_journal 的 risk_level 只能是「低」/「中」/「高」，後端 parse
    邏輯跟前端顯示都靠這幾個固定的中文字比對），這種欄位不能因為語言指示被
    改寫成英文，否則會跟既有的字串比對/資料庫既有紀錄語言對不起來。呼叫端
    可以透過這個參數補一句提醒，明確告訴模型哪些欄位要維持原本格式，不受
    這句語言指示影響。
    """
    resolved = resolve_language(language)
    if resolved == "en":
        directive = (
            "\n\nIMPORTANT: Regardless of what language the instructions above "
            "are written in, write every free-text value in your JSON response "
            "(summaries, descriptions, names, notes, suggestions, messages, "
            "etc.) in English, not Chinese."
        )
    else:
        directive = "\n\n請注意：請一律使用繁體中文撰寫回覆 JSON 中的所有文字欄位內容。"

    if enum_note:
        directive += f" {enum_note}"
    return directive
