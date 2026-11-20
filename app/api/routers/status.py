import logging
from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from app.redis import get_redis
from app.services.time_service import get_lesson_window_status
from app.schemas.admin import StatusResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=StatusResponse)
async def get_system_status(
    redis: Redis = Depends(get_redis)
):
    """
    Toshkent vaqti, dam olish kuni va dars oynalari holatini qaytaradi.
    Shuningdek global blok holatini tekshiradi.
    """
    status_data = get_lesson_window_status()

    # Global blok holatini tekshirish
    try:
        block_ttl = await redis.ttl("admin_block_global")
        if block_ttl and block_ttl > 0:
            status_data["is_blocked"] = True
            status_data["block_ttl"] = block_ttl
        else:
            status_data["is_blocked"] = False
            status_data["block_ttl"] = 0
    except Exception as e:
        logger.warning(f"Status tekshirishda Redis xatoligi: {e}")
        status_data["is_blocked"] = False
        status_data["block_ttl"] = 0

    return status_data
