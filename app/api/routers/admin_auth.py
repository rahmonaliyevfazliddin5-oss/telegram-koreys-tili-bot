import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis
from sqlalchemy import select

from app.redis import get_redis
from app.database import async_session_maker
from app.models.bot_user import BotUser
from app.api.deps import get_current_admin
from app.bot.loader import bot
from app.bot.handlers.user import get_active_sources
from app.bot.keyboards.user_kb import get_main_menu_keyboard
from app.i18n.texts import get_text

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/logout", status_code=status.HTTP_200_OK)
async def admin_logout(
    admin: Dict[str, Any] = Depends(get_current_admin),
    redis: Redis = Depends(get_redis)
):
    user_id = admin["user_id"]

    # 1. Redis'dagi admin sessiyasini o'chirish
    session_key = f"admin_session:{user_id}"
    await redis.delete(session_key)

    # 2. Foydalanuvchi tilini aniqlash (Redis yoki DB)
    lang_key = f"user_lang:{user_id}"
    lang = await redis.get(lang_key)
    if not lang:
        async with async_session_maker() as session:
            stmt = select(BotUser.language).where(BotUser.telegram_id == user_id)
            result = await session.execute(stmt)
            lang = result.scalar_one_or_none()
    lang = lang or "uz"

    # 3. Foydalanuvchiga Telegram bot orqali oddiy bosh menyuni yuborish
    try:
        sources = await get_active_sources(lang)
        titles = [s["title"] for s in sources]
        menu_text = get_text("main_menu", lang)
        keyboard = get_main_menu_keyboard(lang, titles)
        await bot.send_message(
            chat_id=user_id,
            text=menu_text,
            reply_markup=keyboard
        )
    except Exception as e:
        logger.warning(f"Logout paytida Telegram menyusini yuborishda xatolik (user_id={user_id}): {e}")

    return {"ok": True}
