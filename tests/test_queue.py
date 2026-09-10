from unittest.mock import AsyncMock

import pytest

from core import redis


@pytest.mark.asyncio
async def test_enqueue_task_uses_saq_retry_defaults(monkeypatch):
    enqueue = AsyncMock()
    monkeypatch.setattr(redis.task_queue, "enqueue", enqueue)

    await redis.enqueue_task("example_task", value="payload")

    enqueue.assert_awaited_once_with(
        "example_task",
        timeout=300,
        retries=5,
        retry_delay=1,
        retry_backoff=True,
        value="payload",
    )


@pytest.mark.asyncio
async def test_enqueue_email_uses_registered_worker_name(monkeypatch):
    enqueue_task = AsyncMock()
    monkeypatch.setattr(redis, "enqueue_task", enqueue_task)

    await redis.enqueue_send_email("user@example.com", "Subject", "<p>Body</p>")

    enqueue_task.assert_awaited_once_with(
        "send_email_task",
        to="user@example.com",
        subject="Subject",
        html="<p>Body</p>",
    )
