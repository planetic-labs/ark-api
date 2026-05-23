import redis.asyncio as redis
from backend.core.config import settings

# Create a connection pool
pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, 
    decode_responses=True
)

def get_redis_client():
    return redis.Redis(connection_pool=pool)

async def set_auth_code(email: str, code: str) -> None:
    async with get_redis_client() as client:
        key = f"auth:code:{email}"
        await client.set(key, code, ex=settings.AUTH_CODE_EXPIRE_SECONDS)

async def get_auth_code(email: str) -> str | None:
    async with get_redis_client() as client:
        key = f"auth:code:{email}"
        return await client.get(key)

async def delete_auth_code(email: str) -> None:
    async with get_redis_client() as client:
        key = f"auth:code:{email}"
        await client.delete(key)

async def set_setup_token(token_id: str, user_id: str) -> None:
    async with get_redis_client() as client:
        key = f"auth:setup:{token_id}"
        await client.set(key, user_id, ex=1800)  # 30 minutes

async def get_setup_token(token_id: str) -> str | None:
    async with get_redis_client() as client:
        key = f"auth:setup:{token_id}"
        return await client.get(key)

async def delete_setup_token(token_id: str) -> None:
    async with get_redis_client() as client:
        key = f"auth:setup:{token_id}"
        await client.delete(key)
