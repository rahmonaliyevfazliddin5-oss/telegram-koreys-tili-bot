import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from aiogram.types import Update
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.redis import get_redis, close_redis
from app.bot.loader import bot, dp
from app.api.routers import students, attendance, grades, sources

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Ilova ishga tushmoqda...")
    
    # 1. Bazani tekshirish
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("PostgreSQL ulanishi muvaffaqiyatli.")

    # 2. Redisni tekshirish
    redis = await get_redis()
    await redis.ping()
    logger.info("Redis ulanishi muvaffaqiyatli.")

    # 3. Botni ishga tushirish (Polling yoki Webhook)
    polling_task = None
    if getattr(settings, "BOT_MODE", "polling") == "polling":
        await bot.delete_webhook(drop_pending_updates=True)
        polling_task = asyncio.create_task(dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types()))
        logger.info("Telegram bot Long Polling rejimida muvaffaqiyatli ishga tushdi.")
    else:
        webhook_url = f"{settings.WEBAPP_URL}/webhook/{settings.SECRET_PATH}"
        await bot.set_webhook(
            url=webhook_url,
            secret_token=settings.SECRET_TOKEN,
            drop_pending_updates=True,
            allowed_updates=dp.resolve_used_update_types()
        )
        logger.info(f"Telegram webhook ornatildi: {webhook_url}")

    yield

    # Shutdown
    logger.info("Ilova toxtatilmoqda...")
    if polling_task:
        polling_task.cancel()
        try:
            await polling_task
        except (asyncio.CancelledError, Exception):
            pass
    else:
        try:
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception as e:
            logger.error(f"Webhook ochirishda xatolik: {e}")

    await bot.session.close()
    await close_redis()
    await engine.dispose()
    logger.info("Barcha sessiyalar xavfsiz yopildi.")


app = FastAPI(
    title="Telegram Course Bot & Mini App API",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None
)

# CORS sozlamasi: Faqat o'z domeniga ruxsat
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.WEBAPP_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://telegram.org; "
        "style-src 'self'; "
        "frame-ancestors https://web.telegram.org https://*.telegram.org;"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# Healthcheck
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# Telegram Webhook endpoint
@app.post("/webhook/{secret_path}", include_in_schema=False)
async def telegram_webhook(
    secret_path: str,
    request: Request
):
    if secret_path != settings.SECRET_PATH:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topilmadi"
        )

    telegram_token_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if telegram_token_header != settings.SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Taqiqlangan so'rov"
        )

    body = await request.json()
    update = Update.model_validate(body, context={"bot": bot})
    await dp.feed_webhook_update(bot, update)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"ok": True})


# API routerlarni ulash
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(grades.router, prefix="/api/grades", tags=["Grades"])
app.include_router(sources.router, prefix="/api/sources", tags=["Sources"])

# Mini App statik fayllari (/app)
app.mount("/app", StaticFiles(directory="app/static", html=True), name="static_app")
