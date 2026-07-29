import logging

logger = logging.getLogger("app.email")


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """寄送忘記密碼信。

    目前是 dev 版本：沒有接任何真的寄信服務，只是把連結印到 log，
    本機開發時直接從 terminal 複製連結貼到瀏覽器測試即可。

    之後要接真的寄信服務（SMTP / SendGrid / SES 等）時，把這個函式的
    實作換掉就好，呼叫端（routers/auth.py）完全不用改。
    """
    logger.info(
        "[DEV EMAIL] 寄送重設密碼信給 %s，連結：%s",
        to_email,
        reset_link,
    )
    print(f"[DEV EMAIL] 重設密碼連結（寄給 {to_email}）：{reset_link}")
