import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.database import AsyncSessionLocal
from modules.notifications.models import DeviceToken
from modules.notifications.service import send_push_notifications
from modules.users.models import User


async def send_test_push(email: str, title: str, body: str):
    email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        # Find user and load their device tokens
        result = await session.execute(
            select(User)
            .options(selectinload(User.device_tokens))
            .where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"Error: User with email '{email}' not found.")
            return

        if not user.device_tokens:
            # Check all device tokens in DB just in case
            result_tokens = await session.execute(
                select(DeviceToken).where(DeviceToken.user_id == user.id)
            )
            tokens = result_tokens.scalars().all()
            if not tokens:
                print(
                    f"Warning: User '{email}' has no "
                    "registered push tokens in database."
                )
                return
            device_tokens_list = tokens
        else:
            device_tokens_list = user.device_tokens

        print(
            f"Found {len(device_tokens_list)} registered device token(s) for {email}."
        )
        print("Sending test push notification...")

        await send_push_notifications(
            session=session,
            user_ids=[user.id],
            title=title,
            body=body,
            sound="default",
        )
        print("Test push notification task completed.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: uv run python scripts/send_test_push.py <email> [title] [body]")
        sys.exit(1)

    email = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "Тестовое пуш-уведомление"
    body = (
        sys.argv[3]
        if len(sys.argv) > 3
        else "Привет! Это проверка доставки пуш-уведомлений в Ковчеге."
    )

    asyncio.run(send_test_push(email, title, body))
