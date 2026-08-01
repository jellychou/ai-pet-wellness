import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import (
    auth,
    health,
    user,
    pet,
    vaccine,
    report,
    timeline,
    ai_scan,
    food_scan,
    food_record,
)

settings = get_settings()
logger = logging.getLogger("uvicorn.error")

# 注意：這裡刻意不傳 debug=settings.debug。FastAPI(debug=True) 時，Starlette 的
# ServerErrorMiddleware 遇到例外會直接吐出完整 traceback 網頁（略過下面自訂的
# exception_handler），這個 response 也不會經過 CORSMiddleware 補 header，
# 前端就會同時看到「CORS 被擋」+「500」。本地 .env 目前是 DEBUG=true，這正是
# 這次 user-info 500 在瀏覽器變成 CORS 錯誤的原因。想看完整錯誤內容改看伺服器
# log（下面 logger.exception 會印),不要用 FastAPI 的 debug 網頁。
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 沒被接住的例外（例如 DB 欄位對不起來、忘記跑 migration）會被 FastAPI 歸類成「500 / Exception」
# 專用的 handler，掛在 ServerErrorMiddleware 上——這一層在 CORSMiddleware 外面
# （build_middleware_stack 裡是 [ServerErrorMiddleware, *user_middleware(含CORS), ExceptionMiddleware]），
# 所以就算這裡接住例外、正常回應，CORSMiddleware 也沒機會補 header，瀏覽器一樣會看到
# 「CORS 被擋」而不是清楚的 500。這裡先印出完整 traceback 方便看 log，
# 再手動補上 CORS header（跟 CORSMiddleware 用同一份 allow-list 判斷），
# 前端才能真的讀到這個 500 的內容，而不是被瀏覽器擋成 CORS 錯誤。
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    response = JSONResponse(status_code=500, content={"detail": "伺服器發生錯誤，請稍後再試"})
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origin_list:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(pet.router)
app.include_router(vaccine.router)
app.include_router(report.router)
app.include_router(timeline.router)
app.include_router(ai_scan.router)
app.include_router(food_scan.router)
app.include_router(food_record.router)