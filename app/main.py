import asyncio
from pathlib import Path
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from aiogram.types import Update
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "web" / "dist"
STATIC_DIR = DIST_DIR if DIST_DIR.exists() else (BASE_DIR / "app" / "static")

from app.config import settings
from app.database import engine, get_db, async_session_maker
from app.redis import get_redis, close_redis
from app.bot.loader import bot, dp
from app.api.deps import get_current_admin
from app.api.routers import students, attendance, grades, sources, admin_auth, status, lessons, exams, teacher, portal
from app.services.attendance_service import finalize_pending_lessons

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def _lesson_finalizer_loop():
    while True:
        try:
            async with async_session_maker() as db:
                await finalize_pending_lessons(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Lesson finalizer loop xatosi: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Ilova ishga tushmoqda...")
    
    # 1. Bazani tekshirish
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50);"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS homework TEXT;"))
        except Exception:
            pass
        # Admin parolini Inson.7 ga yangilash
        try:
            inson_hash = "29e272469f5f0774d45213bd29ef943d61ba824f386e8422cfe86d419fd8b684"
            await conn.execute(
                text("UPDATE admin_settings SET password_hash = :p_hash, updated_at = NOW() WHERE id = 1"),
                {"p_hash": inson_hash}
            )
        except Exception:
            pass
        # O'quvchi familyasini Rahmonaliyev Fazliddin ga yangilash
        try:
            await conn.execute(
                text("UPDATE students SET last_name = 'Rahmonaliyev' WHERE last_name = 'Raxmatullayev' AND first_name = 'Fazliddin'")
            )
        except Exception:
            pass
        # Yangi o'quvchilarni kiritish va Soibjonova -> Soyibjanova yangilash
        try:
            await conn.execute(
                text("UPDATE students SET last_name = 'Soyibjanova' WHERE last_name = 'Soibjonova' AND first_name = 'Ruqiyaxon'")
            )
            new_st_list = [
                ("Bunyodbek", "Rustamov", "8"),
                ("Asadbek", "Isaqov", None),
                ("Ruqiyaxon", "Soyibjanova", "9"),
                ("Biloliddin", "Axmadov", "9"),
                ("Abdulaziz", "Abduganiyev", "10"),
                ("Nurillo", "Toshtemirov", "10"),
                ("Elbek", "Gʻofurov", "10"),
                ("Abdushukur", "Toshpoʻlatov", "9"),
            ]
            for fn, ln, gr in new_st_list:
                await conn.execute(
                    text(
                        "INSERT INTO students (first_name, last_name, grade, parent_phone, lesson_slots, created_at) "
                        "SELECT :fn, :ln, :gr, NULL, NULL, NOW() "
                        "WHERE NOT EXISTS (SELECT 1 FROM students WHERE first_name = :fn AND last_name = :ln)"
                    ),
                    {"fn": fn, "ln": ln, "gr": gr}
                )
        except Exception:
            pass
    logger.info("PostgreSQL ulanishi muvaffaqiyatli.")

    # 2. Redisni tekshirish va keshni tozalash
    redis = await get_redis()
    await redis.ping()
    try:
        keys = await redis.keys("rating:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass
    logger.info("Redis ulanishi muvaffaqiyatli.")

    # 3. Darslarni yakunlash background loopi
    finalizer_task = asyncio.create_task(_lesson_finalizer_loop())

    # 4. Botni ishga tushirish (Polling yoki Webhook)
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
    if finalizer_task:
        finalizer_task.cancel()
        try:
            await finalizer_task
        except (asyncio.CancelledError, Exception):
            pass

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.warning(f"Validatsiya xatosi [{request.method} {request.url.path}]: {errors}")
    messages = []
    for err in errors:
        msg = err.get("msg", "Noto'g'ri ma'lumot")
        err_type = err.get("type", "")
        if "json_invalid" in err_type:
            messages.append("Yuborilgan so'rov formati yaroqsiz (JSON decode error)")
        else:
            loc = " -> ".join(str(l) for l in err.get("loc", []) if l != "body")
            if loc:
                messages.append(f"{loc}: {msg}")
            else:
                messages.append(msg)
    return JSONResponse(
        status_code=422,
        content={"detail": "; ".join(messages) if messages else "Noto'g'ri ma'lumot kiritildi"}
    )


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
app.include_router(status.router, prefix="/api/status", tags=["Status"])
app.include_router(admin_auth.router, prefix="/api/admin", tags=["Admin Auth"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(grades.router, prefix="/api/grades", tags=["Grades"])
app.include_router(sources.router, prefix="/api/sources", tags=["Sources"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(exams.router, prefix="/api/exams", tags=["Exams"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["Teacher"])
app.include_router(portal.router, prefix="/api", tags=["Portal"])


@app.get("/api/rating", tags=["Students"])
async def get_rating_alias(
    limit: int = 3,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    from app.api.routers.students import get_students_rating
    return await get_students_rating(limit=limit, db=db, admin=admin)


# Mini App statik fayllari (/app)
app.mount("/app", StaticFiles(directory=str(STATIC_DIR), html=True), name="static_app")
