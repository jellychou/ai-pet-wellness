import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger("app.email")
settings = get_settings()


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """寄送忘記密碼信，走 Gmail SMTP。

    需要在 .env 設定 SMTP_USERNAME / SMTP_PASSWORD 才會真的寄信：
      SMTP_USERNAME=你的 gmail 帳號（建議申請一個全新的、專門給這個 App 用的帳號，
                    不要用私人信箱）
      SMTP_PASSWORD=Gmail「應用程式密碼」（不是登入密碼；這個 Gmail 帳號要先開
                    兩步驟驗證，再去 https://myaccount.google.com/apppasswords 產生）

    如果沒設定，退回 dev 版本：只印到 log，不會噴錯，本機開發直接複製連結測試即可。
    寄信失敗也不會讓呼叫端的 API 噴 500——forgot-password 這支 API 不管信有沒有
    寄成功都回同一句話（避免被拿來試哪些 email 有註冊），所以這裡失敗只留 log。
    """
    if not settings.smtp_username or not settings.smtp_password:
        logger.info(
            "[DEV EMAIL] 尚未設定 SMTP，重設密碼連結（寄給 %s）：%s",
            to_email,
            reset_link,
        )
        print(f"[DEV EMAIL] 尚未設定 SMTP，重設密碼連結（寄給 {to_email}）：{reset_link}")
        return

    from_email = settings.smtp_from_email or settings.smtp_username

    message = MIMEMultipart("alternative")
    message["Subject"] = "重設您的 Food・Heart 密碼"
    message["From"] = f"{settings.smtp_from_name} <{from_email}>"
    message["To"] = to_email

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

    message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(from_email, [to_email], message.as_string())
        logger.info("已寄出重設密碼信給 %s", to_email)
    except Exception:
        logger.exception("寄送重設密碼信給 %s 失敗", to_email)
