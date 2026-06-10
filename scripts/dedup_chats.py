import asyncio

from sqlalchemy import delete, select

from core.database import AsyncSessionLocal
from modules.messaging.models import Chat, Message


async def main():
    async with AsyncSessionLocal() as session:
        # 1. Clean up duplicate group chats
        # Get all group chats ordered by creation date
        result = await session.execute(
            select(Chat).where(Chat.is_group == True).order_by(Chat.created_at.asc())
        )
        chats = result.scalars().all()

        seen_names = set()
        to_delete_chats = []

        for chat in chats:
            if not chat.name:
                continue
            if chat.name in seen_names:
                to_delete_chats.append(chat.id)
            else:
                seen_names.add(chat.name)

        if to_delete_chats:
            print(f"Found {len(to_delete_chats)} duplicate chats to delete.")
            # Delete in chunks
            chunk_size = 500
            for i in range(0, len(to_delete_chats), chunk_size):
                chunk = to_delete_chats[i : i + chunk_size]
                await session.execute(delete(Chat).where(Chat.id.in_(chunk)))
            await session.commit()
            print("Successfully deleted duplicate chats.")
        else:
            print("No duplicate chats found.")

        # 2. Clean up duplicate messages in the remaining chats
        # Retrieve all messages ordered by creation date
        msg_result = await session.execute(
            select(Message).order_by(Message.created_at.asc())
        )
        messages = msg_result.scalars().all()

        seen_messages = set()  # Store (chat_id, sender_id, content) tuple
        to_delete_messages = []

        for msg in messages:
            # We target duplicated system seed messages or spam messages
            # e.g., "Добро пожаловать в чат...", "SYSTEM_REPORT:report_1" etc.
            key = (msg.chat_id, msg.sender_id, msg.content)
            if key in seen_messages:
                to_delete_messages.append((msg.id, msg.created_at))
            else:
                seen_messages.add(key)

        if to_delete_messages:
            print(f"Found {len(to_delete_messages)} duplicate messages to delete.")
            # Delete in chunks
            chunk_size = 500
            for i in range(0, len(to_delete_messages), chunk_size):
                chunk = to_delete_messages[i : i + chunk_size]
                for msg_id, created_at in chunk:
                    await session.execute(
                        delete(Message).where(
                            Message.id == msg_id, Message.created_at == created_at
                        )
                    )
            await session.commit()
            print("Successfully deleted duplicate messages.")
        else:
            print("No duplicate messages found.")


if __name__ == "__main__":
    asyncio.run(main())
