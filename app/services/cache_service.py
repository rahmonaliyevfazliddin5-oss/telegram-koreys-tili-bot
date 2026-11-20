import json
import logging
from datetime import datetime, time, timedelta
from typing import List, Dict, Any, Optional
from app.redis import redis_client
from app.services.time_service import get_tashkent_now, is_weekend, LESSON_1_END, LESSON_2_END

logger = logging.getLogger(__name__)

RATING_CACHE_KEY = "rating_cache"
SOURCES_CACHE_KEY_PREFIX = "sources_cache:"


def get_completed_lesson_tag(now: Optional[datetime] = None) -> str:
    """Oxirgi yakunlangan dars (sana, dars raqami) tegini qaytaradi."""
    if now is None:
        now = get_tashkent_now()
    today = now.date()
    t = now.time()
    if not is_weekend(today):
        if t >= LESSON_2_END:
            return f"{today}_2"
        elif t >= LESSON_1_END:
            return f"{today}_1"
    d = today - timedelta(days=1)
    while is_weekend(d):
        d -= timedelta(days=1)
    return f"{d}_2"


def get_current_rating_cache_key() -> str:
    return f"{RATING_CACHE_KEY}:{get_completed_lesson_tag()}"


async def get_cached_rating() -> Optional[List[Dict[str, Any]]]:
    try:
        cached = await redis_client.get(get_current_rating_cache_key())
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Reyting keshini olishda xatolik: {e}")
    return None


async def set_cached_rating(rating_data: List[Dict[str, Any]], ttl: int = 3600) -> None:
    try:
        await redis_client.set(get_current_rating_cache_key(), json.dumps(rating_data), ex=ttl)
    except Exception as e:
        logger.warning(f"Reyting keshini saqlashda xatolik: {e}")


async def get_cached_sources(lang: str) -> Optional[List[Dict[str, Any]]]:
    try:
        cached = await redis_client.get(f"{SOURCES_CACHE_KEY_PREFIX}{lang}")
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Manbalar keshini olishda xatolik: {e}")
    return None


async def set_cached_sources(lang: str, sources_data: List[Dict[str, Any]], ttl: int = 3600) -> None:
    try:
        await redis_client.set(f"{SOURCES_CACHE_KEY_PREFIX}{lang}", json.dumps(sources_data), ex=ttl)
    except Exception as e:
        logger.warning(f"Manbalar keshini saqlashda xatolik: {e}")


async def invalidate_rating_cache() -> None:
    try:
        await redis_client.delete(RATING_CACHE_KEY, get_current_rating_cache_key())
    except Exception as e:
        logger.warning(f"Reyting keshini tozalashda xatolik: {e}")


async def invalidate_sources_cache() -> None:
    try:
        keys = [
            f"{SOURCES_CACHE_KEY_PREFIX}uz",
            f"{SOURCES_CACHE_KEY_PREFIX}en",
            f"{SOURCES_CACHE_KEY_PREFIX}ru"
        ]
        await redis_client.delete(*keys)
    except Exception as e:
        logger.warning(f"Manbalar keshini tozalashda xatolik: {e}")


async def invalidate_all_caches() -> None:
    await invalidate_rating_cache()
    await invalidate_sources_cache()
