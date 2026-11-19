from redis.asyncio import Redis, ConnectionPool
from app.config import settings

redis_pool = ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    max_connections=50
)

redis_client = Redis(connection_pool=redis_pool)


async def get_redis() -> Redis:
    return redis_client


async def close_redis() -> None:
    await redis_client.close()
    await redis_pool.disconnect()
