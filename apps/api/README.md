# API（FastAPI + PostgreSQL）

## 技術

- FastAPI
- SQLAlchemy 2.0 + Alembic（migration）
- PostgreSQL（psycopg2）
- pydantic-settings（讀取 `.env`）

## 第一次設定

### 1. 啟動本機 PostgreSQL

兩種方式擇一：

**方式 A：docker-compose**
在 repo 根目錄執行：

```bash
docker compose up -d postgres
```

**方式 B：直接在 Mac 上裝（不用 Docker）**

如果電腦上已經有裝過 Postgres（例如 Postgres.app，或之前上課裝的），**不用重灌**，直接用現有的就好，跳到下面「已經有 Postgres」。

全新安裝：

```bash
brew install postgresql@16
brew services start postgresql@16
```

Homebrew 裝好後預設用你的 macOS 帳號當 superuser 登入（不需密碼），用它建立我們專案要用的 `postgres` 角色跟資料庫：

```bash
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
createdb -O postgres ai_pet_wellness
```

（如果 `psql`/`createdb` 指令找不到，代表 Homebrew 沒有把它加進 PATH，執行 `brew link postgresql@16` 或依照 `brew install` 結尾印出的提示把路徑加進 `~/.zshrc`）

之後要停掉/重啟服務：

```bash
brew services stop postgresql@16
brew services restart postgresql@16
```

**已經有 Postgres（例如 Postgres.app 或之前上課裝的）：**
`postgres` 這個角色通常早就存在、密碼也已經設定好了（不一定是 `postgres`）。不要重新 `CREATE ROLE`，只要建立這個專案要用的資料庫就好：

```bash
createdb -O postgres ai_pet_wellness
# 或連進去用 SQL 建：CREATE DATABASE ai_pet_wellness OWNER postgres;
```

然後把 `apps/api/.env` 裡 `DATABASE_URL` 的密碼改成你原本 Postgres 帳號真正的密碼（例如以前上課教的 `123456`）：

```
DATABASE_URL=postgresql+psycopg2://postgres:你的密碼@localhost:5432/ai_pet_wellness
```

**方式 C：Neon（雲端，不用在本機裝任何 Postgres，推薦）**

1. 去 https://neon.tech 註冊（可以直接用 GitHub 登入）並建立一個新 Project，會自動幫你建好一個資料庫
2. 到 Project 的 Dashboard 找 **Connection string**，複製那組 `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
3. 貼到 `apps/api/.env` 的 `DATABASE_URL`，但要把開頭 `postgresql://` 改成 `postgresql+psycopg2://`（SQLAlchemy 要指定 driver），結尾的 `?sslmode=require` 要保留（Neon 強制要求 SSL 連線）：
   ```
   DATABASE_URL=postgresql+psycopg2://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. 這樣就不用再管本機 Postgres 版本衝突的問題，也不用先跑 `docker compose up`，`alembic upgrade head` 前直接連得到

免費方案 500MB，資料庫本身不會因為閒置被砍掉（只有運算資源會自動休眠，有連線進來就自動醒），適合長期擺著開發用。之後部署到 Render 的時候，`DATABASE_URL` 也一樣指到這組 Neon 連線字串就好，不用再另外接 Render 自己的 Postgres。

### 2. 建立虛擬環境並安裝套件

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 設定環境變數

```bash
cp .env.example .env
```

預設值已對應 docker-compose 起的 Postgres，不需要改也能跑。

### 4. 跑 migration

```bash
alembic upgrade head
```

### 5. 啟動開發伺服器

```bash
uvicorn app.main:app --reload --port 8000
```

啟動後可以打開 http://localhost:8000/docs 看自動產生的 API 文件，或呼叫 http://localhost:8000/health/ 確認服務正常、http://localhost:8000/health/db 確認資料庫連線正常。

## 帳密登入

- `POST /auth/register`：`{ email, password, name, phone, birthday, picture_url?, slogan? }`，密碼用 bcrypt 雜湊後才存進 DB，回傳 `TokenResponse`（含 `access_token`）
- `POST /auth/login`：`{ email, password }`，驗證通過回傳 `TokenResponse`

之後打其他需要登入的 API 就帶 `Authorization: Bearer <access_token>`，`GET /auth/user-info` 可以用來取得目前登入的使用者資料。

## 忘記密碼 / 重設密碼

- `POST /auth/forgot-password`：`{ email }`，不管這個 email 有沒有註冊過都回同一句訊息（避免被拿來試哪些 email 有註冊）。查到帳號的話會產生一組 token、雜湊後存進 DB（`users.reset_token_hash`／`reset_token_expires_at`，預設 30 分鐘過期，可用 `.env` 的 `RESET_TOKEN_EXPIRES_MINUTES` 調整），並把包含明文 token 的重設連結送去 `app/core/email.py`
- `POST /auth/reset-password`：`{ token, new_password }`，驗證 token 沒過期、沒用過，通過就更新密碼並把 token 作廢（單次使用）

**`app/core/email.py` 目前是 dev 版本**，沒有接真的寄信服務，重設連結只會印到後端的 log／console（跑 `uvicorn` 的那個終端機視窗），本機測試時直接從那邊複製連結貼到瀏覽器（`<前端網址>/reset-password?token=xxx`）即可。要接真的信箱（SMTP、SendGrid…）時只要改這個檔案裡 `send_password_reset_email` 的實作，呼叫端不用動。

## 資料夾結構

```
apps/api/
├── app/
│   ├── main.py          # FastAPI app 進入點
│   ├── core/config.py   # 環境變數設定
│   ├── db/               # SQLAlchemy engine / session / Base
│   ├── models/           # ORM models（新增後記得在 __init__.py import）
│   ├── schemas/          # Pydantic request/response models
│   └── routers/          # API 路由
├── alembic/               # Migration 腳本
├── requirements.txt
└── .env.example
```

## 新增一個 model 的流程

1. 在 `app/models/` 新增 model 檔案，繼承 `app.db.base.Base`
2. 在 `app/models/__init__.py` import 這個 model
3. 產生 migration：
   ```bash
   alembic revision --autogenerate -m "add xxx table"
   alembic upgrade head
   ```
4. 在 `app/schemas/` 加對應的 Pydantic schema，`app/routers/` 加路由
