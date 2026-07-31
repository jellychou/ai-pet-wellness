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

    # 忘記密碼信走 Gmail SMTP 寄送。
    # 建議申請一個全新的、專門給這個 App 用的 Gmail 帳號，不要用私人信箱。
    # SMTP_USERNAME/SMTP_PASSWORD 沒設的話（例如本機開發還沒申請），
    # 會自動退回只印到 log 的 dev 版本，不會噴錯。
    # SMTP_PASSWORD 要用 Gmail「應用程式密碼」，不是登入密碼：
    # 這個 Gmail 帳號要先開兩步驟驗證，再去 https://myaccount.google.com/apppasswords 產生一組。
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    # 寄件人顯示的名稱／email，不填的話 from email 就用 smtp_username
    smtp_from_name: str = "Food・Heart"
    smtp_from_email: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
