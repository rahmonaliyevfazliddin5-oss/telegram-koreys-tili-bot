from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Message
from app.redis import redis_client


class BotRateLimitMiddleware(BaseMiddleware):
    def __init__(self, limit: int = 5, window: int = 5):
        self.limit = limit
        self.window = window

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        if isinstance(event, Message) and event.from_user:
            user_id = event.from_user.id
            key = f"bot_rate:{user_id}"
            
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, self.window)

            if count > self.limit:
                # Spam qiluvchi so'rovlar e'tiborsiz qoldiriladi
                return None

        return await handler(event, data)
