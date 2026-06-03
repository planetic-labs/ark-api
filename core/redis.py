import redis.asyncio as redis
from core.config import settings

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

_arq_pool = None

async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        from arq import create_pool
        from arq.connections import RedisSettings
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        _arq_pool = await create_pool(redis_settings)
    return _arq_pool

async def enqueue_revocation_webhook(
    user_id: str, 
    jti: str | None, 
    webhook_url: str, 
    webhook_secret: str
) -> None:
    pool = await get_arq_pool()
    await pool.enqueue_job(
        "send_webhook_revocation", 
        user_id=user_id, 
        jti=jti, 
        webhook_url=webhook_url, 
        webhook_secret=webhook_secret
    )

