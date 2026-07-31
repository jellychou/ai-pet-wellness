"""一次性腳本：取得 Gmail API 寄信用的 refresh token。

這支腳本只需要在「你自己的電腦」上跑一次，跑完把印出來的 refresh token
存進 apps/api/.env（不要存進 .env.example），伺服器執行時不會用到這支腳本。

事前準備（在 Google Cloud Console 做）：
  1. 前往 https://console.cloud.google.com/ 建立一個專案（或用現有的）。
  2. 左側選單「APIs & Services」→「Library」，搜尋「Gmail API」，點進去按 Enable。
  3. 左側選單「APIs & Services」→「OAuth consent screen」：
     - User Type 選 External，填基本資料建立。
     - 「Test users」加入你要拿來寄信的那個 Gmail 帳號（例如
       petwellness0418@gmail.com），這樣就不用送 Google 審核也能用。
  4. 左側選單「APIs & Services」→「Credentials」→「Create Credentials」
     →「OAuth client ID」，Application type 選「Desktop app」，建立後
     會拿到一組 Client ID / Client secret。

使用方式：
  1. 安裝一次性用的套件（只有跑這支腳本需要，伺服器不需要）：
       pip install google-auth-oauthlib --break-system-packages
  2. 執行：
       python3 apps/api/scripts/get_gmail_refresh_token.py
     依提示貼上 Client ID / Client secret，瀏覽器會自動打開，
     用「Test users」裡加的那個 Gmail 帳號登入並同意授權。
  3. 終端機會印出 refresh token，把它跟 client id / secret 一起存進
     apps/api/.env：
       GMAIL_CLIENT_ID=...
       GMAIL_CLIENT_SECRET=...
       GMAIL_REFRESH_TOKEN=...
       GMAIL_FROM_EMAIL=你剛剛登入授權的那個 gmail 帳號
     Render 上的環境變數也要設定一樣的值。
"""

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]


def main() -> None:
    client_id = input("Client ID: ").strip()
    client_secret = input("Client secret: ").strip()

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }

    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    # access_type="offline" 才會拿到 refresh token（預設只給短效的 access token）；
    # prompt="consent" 強制每次都重新跳出同意畫面，不然如果這個帳號之前已經
    # 同意過一次，Google 之後不會再給 refresh token，會拿到 None
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    if not creds.refresh_token:
        print(
            "\n沒有拿到 refresh token！"
            "可能是這個帳號之前已經同意過、但這次沒跳出同意畫面。"
            "去 https://myaccount.google.com/permissions 把這個應用程式的授權撤銷掉，"
            "再重新跑一次這支腳本。\n"
        )
        return

    print("\n拿到囉，把下面這些值存進 apps/api/.env：\n")
    print(f"GMAIL_CLIENT_ID={client_id}")
    print(f"GMAIL_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")


if __name__ == "__main__":
    main()
