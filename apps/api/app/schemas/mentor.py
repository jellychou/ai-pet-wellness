from datetime import datetime

from pydantic import BaseModel


# 對應 OpenAI chat messages 的一則訊息，role 只會是 "user" 或 "assistant"
class MentorMessage(BaseModel):
    role: str
    content: str


# 方案 B：前端不用送整段歷史，只送「這次新輸入的內容」+「這是哪一個
# session」，歷史由後端自己去 mentor_messages 撈。mentor_session_id 是
# None 代表要開一段新對話。
class MentorRequest(BaseModel):
    pet_id: int
    mentor_session_id: int | None = None
    # 使用者這次打的字。開新對話的第一次呼叫可以是空字串（純粹只是要 AI
    # 主動開場），非第一次呼叫則應該有內容
    content: str = ""
    image_url: str | None = None
    # 只有開新對話（mentor_session_id 是 None）才有意義：把其他功能想
    # 帶進來的當日分析摘要（例如 AiScanDrawer 的「詢問 AI 心靈導師」）
    # 塞進來，讓 AI 開場白可以直接引用，不用使用者自己重講一次
    context: str | None = None


class MentorUsageOut(BaseModel):
    used: int
    limit: int
    unlimited: bool = False


class MentorResponse(BaseModel):
    id: int  # 這個 session 的 id，前端下一輪要帶著這個當 mentor_session_id
    is_finished: bool
    message: MentorMessage  # 這次 AI 回的話
    created_at: datetime
    # 只有 is_finished=True 時才有值，對應畫面上分類條列的重點摘要
    summary_sections: list[str] | None = None
    # 只有 is_finished=False 時才有值，前端渲染成可點的快速回覆按鈕
    quick_replies: list[str] | None = None
    usage: MentorUsageOut


# 「檢視記錄」用：某個 session 底下完整的對話紀錄，直接從 mentor_messages
# 讀出來，前端可以拿來還原整段聊天畫面
class MentorHistoryMessageOut(BaseModel):
    role: str
    content: str
    image_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
