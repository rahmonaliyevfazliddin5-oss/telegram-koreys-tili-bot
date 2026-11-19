import json
import logging
from typing import List, Dict, Any, Optional
from app.redis import redis_client

logger = logging.getLogger(__name__)

RATING_CACHE_KEY = "rating_cache"
SOURCES_CACHE_KEY_PREFIX = "sources_cache:"


async def get_cached_rating() -> Optional[List[Dict[str, Any]]]:
    try:
        cached = await redis_client.get(RATING_CACHE_KEY)
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Reyting keshini olishda xatolik: {e}")
    return None


async def set_cached_rating(rating_data: List[Dict[str, Any]], ttl: int = 3600) -> None:
    try:
        await redis_client.set(RATING_CACHE_KEY, json.dumps(rating_data), ex=ttl)
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
        await redis_client.delete(RATING_CACHE_KEY)
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
