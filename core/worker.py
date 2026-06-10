import hashlib
import hmac
import json
from typing import Any

import httpx
import structlog
from arq.connections import RedisSettings

from core.config import settings

logger = structlog.get_logger()


async def send_webhook_revocation(
    ctx: dict[str, Any],
    user_id: str,
    jti: str | None,
    webhook_url: str,
    webhook_secret: str,
) -> None:
    """
    Отправляет Webhook при отзыве сессии или блокировке пользователя.
    """
    if not webhook_url:
        logger.warning("Webhook URL is empty, skipping task")
        return

    secret_key = webhook_secret or settings.SECRET_KEY

    payload_data = {"event": "session_revoked", "user_id": user_id, "jti": jti}
    payload_str = json.dumps(payload_data, sort_keys=True)

    # Генерация HMAC-SHA256 подписи
    signature = hmac.new(
        secret_key.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    headers = {"Content-Type": "application/json", "X-Ark-Signature": signature}

    client: httpx.AsyncClient = ctx.get("http_client") or httpx.AsyncClient(
        timeout=10.0
    )

    logger.info("Sending revocation webhook", url=webhook_url, user_id=user_id, jti=jti)

    try:
        response = await client.post(webhook_url, content=payload_str, headers=headers)
        response.raise_for_status()
        logger.info(
            "Revocation webhook sent successfully", status_code=response.status_code
        )
    except httpx.HTTPStatusError as e:
        logger.error(
            "Failed to send webhook due to HTTP status error",
            status_code=e.response.status_code,
            error=str(e),
        )
        # Возбуждаем исключение, чтобы arq выполнил retry задачи
        raise e
    except httpx.RequestError as e:
        logger.error(
            "Failed to send webhook due to network request error", error=str(e)
        )
        raise e


async def startup(ctx: dict[str, Any]) -> None:
    """
    Инициализация ресурсов при старте воркера.
    """
    ctx["http_client"] = httpx.AsyncClient(timeout=10.0)
    logger.info("ARQ worker started")


async def shutdown(ctx: dict[str, Any]) -> None:
    """
    Очистка ресурсов при остановке воркера.
    """
    client: httpx.AsyncClient | None = ctx.get("http_client")
    if client:
        await client.aclose()
    logger.info("ARQ worker stopped")


async def send_push_notification_task(
    ctx: dict[str, Any],
    user_ids: list[str],
    title: str,
    body: str,
    sound: str | None = "default",
    channel_id: str | None = None,
    data: dict[str, str] | None = None,
) -> None:
    """
    Фоновая задача ARQ для асинхронной отправки push-уведомлений через Expo Push API.
    """
    from core.database import AsyncSessionLocal
    from modules.notifications.service import send_push_notifications

    logger.info("ARQ task: sending push notifications", user_ids=user_ids, title=title)
    try:
        async with AsyncSessionLocal() as session:
            await send_push_notifications(
                session=session,
                user_ids=user_ids,
                title=title,
                body=body,
                sound=sound,
                channel_id=channel_id,
                data=data,
            )
    except Exception as e:
        logger.error(
            "Failed to send push notifications in background task", error=str(e)
        )
        raise e


class WorkerSettings:
    """
    Конфигурация воркера для запуска через arq CLI.
    """

    functions = [send_webhook_revocation, send_push_notification_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown
