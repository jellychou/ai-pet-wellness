import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials

from app.core.config import get_settings

logger = logging.getLogger("app.email")
settings = get_settings()

GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def _get_access_token() -> str:
    """用 refresh token 換一組短效的 access token。

    這裡刻意不快取 access token：每次寄信都重新換一次，實作簡單很多，
    寄信頻率不高（忘記密碼），多換幾次 token 的成本可以忽略。
    """
    creds = Credentials(
        token=None,
        refresh_token=settings.gmail_refresh_token,
        client_id=settings.gmail_client_id,
        client_secret=settings.gmail_client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=GMAIL_SCOPES,
    )
    creds.refresh(GoogleAuthRequest())
    return creds.token


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """寄送忘記密碼信，走 Gmail API（不是 SMTP）。

    用 Gmail API 而不是 SMTP 的原因：Render 免費方案會封鎖對外的 SMTP port
    （25/465/587），程式碼再對也連不出去；Gmail API 走的是一般的 HTTPS
    （port 443），不受這個限制。

    需要在 .env 設定：
      GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN
        —— 這三個要跑一次性腳本取得，細節看
           apps/api/scripts/get_gmail_refresh_token.py
      GMAIL_FROM_EMAIL
        —— 一定要是跑上面那個腳本時，登入授權的那個 Gmail 帳號

    沒設定齊全的話，退回 dev 版本：只印到 log，不會噴錯，本機開發直接複製
    連結測試即可。寄信失敗也不會讓呼叫端的 API 噴 500——forgot-password
    這支 API 不管信有沒有寄成功都回同一句話（避免被拿來試哪些 email 有
    註冊），所以這裡失敗只留 log。
    """
    if not (
        settings.gmail_client_id
        and settings.gmail_client_secret
        and settings.gmail_refresh_token
        and settings.gmail_from_email
    ):
        logger.info(
            "[DEV EMAIL] 尚未設定 Gmail API，重設密碼連結（寄給 %s）：%s",
            to_email,
            reset_link,
        )
        print(
            f"[DEV EMAIL] 尚未設定 Gmail API，重設密碼連結（寄給 {to_email}）：{reset_link}"
        )
        return

    text_body = (
        "您好，\n\n"
        "我們收到您重設密碼的請求，請點擊以下連結重設密碼：\n"
        f"{reset_link}\n\n"
        f"這個連結將在 {settings.reset_token_expires_minutes} 分鐘後失效。\n"
        "如果這不是您本人的操作，請忽略這封信，您的密碼不會被更動。\n\n"
        "Food・Heart 團隊"
    )
    html_body = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #4a4340;">
      <h2 style="color: #c9784a;">重設您的密碼</h2>
      <p>您好，我們收到您重設密碼的請求，請點擊以下按鈕重設密碼：</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{reset_link}"
           style="background: #caa06f; color: #fff; padding: 12px 28px; border-radius: 12px;
                  text-decoration: none; font-weight: 600; display: inline-block;">
          重設密碼
        </a>
      </p>
      <p style="font-size: 12px; color: #999;">
        這個連結將在 {settings.reset_token_expires_minutes} 分鐘後失效。
        如果這不是您本人的操作，請忽略這封信，您的密碼不會被更動。
      </p>
    </div>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = "重設您的 Food・Heart 密碼"
    message["From"] = f"{settings.gmail_from_name} <{settings.gmail_from_email}>"
    message["To"] = to_email
    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    try:
        access_token = _get_access_token()
        response = requests.post(
            GMAIL_SEND_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"raw": raw},
            timeout=10,
        )
        response.raise_for_status()
        logger.info("已寄出重設密碼信給 %s", to_email)
    except Exception:
        logger.exception("寄送重設密碼信給 %s 失敗", to_email)
