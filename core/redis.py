import redis.asyncio as redis
from saq.queue.redis import RedisQueue

from core.config import settings

# Create a connection pool
pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


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


task_queue = RedisQueue.from_url(settings.REDIS_URL, name="ark")


async def enqueue_task(function: str, **kwargs) -> None:
    await task_queue.enqueue(
        function,
        timeout=300,
        retries=5,
        retry_delay=1,
        retry_backoff=True,
        **kwargs,
    )


async def enqueue_revocation_webhook(
    user_id: str, jti: str | None, webhook_url: str, webhook_secret: str
) -> None:
    await enqueue_task(
        "send_webhook_revocation",
        user_id=user_id,
        jti=jti,
        webhook_url=webhook_url,
        webhook_secret=webhook_secret,
    )


async def enqueue_push_notification(
    user_ids: list[str],
    title: str,
    body: str,
    sound: str | None = "default",
    channel_id: str | None = None,
    data: dict[str, str] | None = None,
) -> None:
    await enqueue_task(
        "send_push_notification_task",
        user_ids=user_ids,
        title=title,
        body=body,
        sound=sound,
        channel_id=channel_id,
        data=data,
    )


async def enqueue_send_email(
    to: str,
    subject: str,
    html: str,
) -> None:
    await enqueue_task(
        "send_email_task",
        to=to,
        subject=subject,
        html=html,
    )
