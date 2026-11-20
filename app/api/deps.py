from typing import AsyncGenerator, Dict, Any
from fastapi import Request, Depends, HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.redis import get_redis
from app.api.auth import validate_init_data


async def get_current_admin(
    request: Request,
    redis: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization sarlavhasi talab qilinadi"
        )

    # 0. Global blok tekshiruvi (3 marta xato kiritilganda 30 daqiqa global blok)
    global_block = await redis.get("admin_block_global")
    if global_block:
        ttl = await redis.ttl("admin_block_global")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tizim global bloklangan. Qolgan vaqt: {ttl} soniya."
        )

    # Mini App yuborgan initData ni ajratib olish
    init_data = auth_header
    if init_data.startswith("tma "):
        init_data = init_data[4:].strip()
    elif init_data.startswith("Bearer "):
        init_data = init_data[7:].strip()

    # 1. initData HMAC tekshiruvi va user_id ni ajratish
    user_info = validate_init_data(init_data, settings.BOT_TOKEN)
    user_id = user_info["user_id"]

    # 2. Foydalanuvchi bloklanganligini tekshirish
    user_block = await redis.get(f"admin_block:{user_id}")
    if user_block:
        ttl = await redis.ttl(f"admin_block:{user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin kirishi bloklangan. Qolgan vaqt: {ttl} soniya."
        )

    # 3. Redis'da admin_session:{user_id} borligini tekshirish
    session_key = f"admin_session:{user_id}"
    session_exists = await redis.get(session_key)
    if not session_exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin sessiyasi topilmadi yoki muddati tugagan. Qaytadan /admin orqali kiring."
        )

    # 4. Mini App API so'rovlari uchun Redis asosidagi Rate limit
    rate_limit_key = f"rate_limit:{user_id}"
    request_count = await redis.incr(rate_limit_key)
    if request_count == 1:
        await redis.expire(rate_limit_key, settings.RATE_LIMIT_WINDOW)
    
    if request_count > settings.RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="So'rovlar soni me'yordan oshdi. Biroz kuting."
        )

    return user_info
