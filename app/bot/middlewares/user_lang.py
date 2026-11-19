from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message, CallbackQuery
from sqlalchemy import select

from app.redis import redis_client
from app.database import async_session_maker
from app.models.bot_user import BotUser


class UserLangMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        user = None
        if isinstance(event, Message) and event.from_user:
            user = event.from_user
        elif isinstance(event, CallbackQuery) and event.from_user:
            user = event.from_user

        if not user:
            data["lang"] = "uz"
            return await handler(event, data)

        user_id = user.id
        lang_cache_key = f"user_lang:{user_id}"
        cached_lang = await redis_client.get(lang_cache_key)

        if cached_lang:
            data["lang"] = cached_lang
            return await handler(event, data)

        # Redis'da yo'q bo'lsa bazadan tekshirish
        async with async_session_maker() as session:
            stmt = select(BotUser.language).where(BotUser.telegram_id == user_id)
            result = await session.execute(stmt)
            db_lang = result.scalar_one_or_none()

            if db_lang:
                await redis_client.set(lang_cache_key, db_lang, ex=86400 * 7)
                data["lang"] = db_lang
            else:
                data["lang"] = None  # Yangi foydalanuvchi

        return await handler(event, data)
