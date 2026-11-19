import json
from typing import List, Dict, Any, Optional
from app.redis import redis_client

RATING_CACHE_KEY = "rating_cache"
SOURCES_CACHE_KEY_PREFIX = "sources_cache:"


async def get_cached_rating() -> Optional[List[Dict[str, Any]]]:
    cached = await redis_client.get(RATING_CACHE_KEY)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            return None
    return None


async def set_cached_rating(rating_data: List[Dict[str, Any]], ttl: int = 3600) -> None:
    await redis_client.set(RATING_CACHE_KEY, json.dumps(rating_data), ex=ttl)


async def get_cached_sources(lang: str) -> Optional[List[Dict[str, Any]]]:
    cached = await redis_client.get(f"{SOURCES_CACHE_KEY_PREFIX}{lang}")
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            return None
    return None


async def set_cached_sources(lang: str, sources_data: List[Dict[str, Any]], ttl: int = 3600) -> None:
    await redis_client.set(f"{SOURCES_CACHE_KEY_PREFIX}{lang}", json.dumps(sources_data), ex=ttl)


async def invalidate_rating_cache() -> None:
    await redis_client.delete(RATING_CACHE_KEY)


async def invalidate_sources_cache() -> None:
    keys = [
        f"{SOURCES_CACHE_KEY_PREFIX}uz",
        f"{SOURCES_CACHE_KEY_PREFIX}en",
        f"{SOURCES_CACHE_KEY_PREFIX}ru"
    ]
    await redis_client.delete(*keys)


async def invalidate_all_caches() -> None:
    await invalidate_rating_cache()
    await invalidate_sources_cache()
