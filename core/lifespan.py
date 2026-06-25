import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from core.websocket import redis_broadcast_reader
from modules.users.init_db import create_superuser_if_not_exists

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Управление жизненным циклом приложения."""
    logger.info("Application starting up")
    broadcast_task = asyncio.create_task(redis_broadcast_reader())
    broadcast_task.add_done_callback(_handle_task_error)
    await create_superuser_if_not_exists()
    yield
    logger.info("Application shutting down")
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass
    from core.database import engine

    await engine.dispose()
    from core.redis import pool

    await pool.disconnect()


def _handle_task_error(task: asyncio.Task[None]) -> None:
    if task.cancelled():
        return
    exc = task.exception()
    if exc:
        logger.error("Background task failed", error=str(exc))
