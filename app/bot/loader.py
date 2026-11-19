from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.redis import RedisStorage
from app.config import settings
from app.redis import redis_client
from app.bot.middlewares.rate_limit import BotRateLimitMiddleware
from app.bot.middlewares.user_lang import UserLangMiddleware
from app.bot.handlers import admin, user

bot = Bot(
    token=settings.BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)

storage = RedisStorage(redis=redis_client)
dp = Dispatcher(storage=storage)

# Middleware'larni ro'yxatdan o'tkazish
dp.message.middleware(BotRateLimitMiddleware(limit=5, window=5))
dp.message.middleware(UserLangMiddleware())
dp.callback_query.middleware(UserLangMiddleware())

# Handler routerlarini ulash
dp.include_router(admin.router)
dp.include_router(user.router)
