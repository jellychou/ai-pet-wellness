from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """全域設定，會自動從環境變數 / .env 檔案讀取。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ai-pet-wellness-api"
    debug: bool = False

    # e.g. postgresql+psycopg2://user:password@localhost:5432/ai_pet_wellness
    database_url: str = (
        "postgresql+psycopg2://postgres:123456@localhost:5432/ai_pet_wellness"
    )

    # 前端開發伺服器網址（逗號分隔），用於 CORS 白名單
    cors_origins: str = "http://localhost:5173"

    # Google OAuth Client ID（前端登入用的同一組，後端驗證 ID token 的 audience 要對得上）
    google_client_id: str = ""

    # 簽發我們自己 session JWT 用的密鑰，正式環境務必換成隨機長字串並放在 .env（不要 commit）
    jwt_secret_key: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 天

    # 前端網址，組「忘記密碼」信件裡的重設連結用（<frontend_base_url>/reset-password?token=xxx）
    frontend_base_url: str = "http://localhost:5173"
    # 重設密碼 token 的有效時間
    reset_token_expires_minutes: int = 30

    # 忘記密碼信走 Gmail API 寄送（不是 SMTP —— Render 免費方案會封鎖對外的
    # SMTP port，Gmail API 走的是 HTTPS，不受影響）。
    # 這三個值要跑一次性的 OAuth 授權腳本才能拿到，細節看
    # apps/api/scripts/get_gmail_refresh_token.py 裡的說明。
    # 沒設定的話會自動退回只印到 log 的 dev 版本，不會噴錯。
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    # 寄件地址：一定要是「跑授權腳本時登入的那個 Gmail 帳號」，不能填別的
    gmail_from_email: str = ""
    gmail_from_name: str = "Pet・Wellness"

    # AI 拍照診斷用，去 https://platform.openai.com/api-keys 申請。沒設定的話
    # /ai-scan/analyze-image 會回 500 並提示要補這個值，不會讓伺服器整個起不來
    openai_api_key: str = ""
    # gpt-4o-mini 有支援圖片輸入、價格便宜，適合這種初步推測用途；
    # 想要更準的分析可以換成 gpt-4o
    openai_model: str = "gpt-4o-mini"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
