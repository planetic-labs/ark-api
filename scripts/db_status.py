import asyncio

from sqlalchemy import select

from core.database import AsyncSessionLocal
from modules.messaging.models import Chat, Message
from modules.users.models import User


async def get_db_status():
    async with AsyncSessionLocal() as session:
        try:
            # Counts
            users_count = (await session.execute(select(User))).scalars().all()
            chats_count = (await session.execute(select(Chat))).scalars().all()
            messages_count = (await session.execute(select(Message))).scalars().all()

            print("========================================")
            print("         ARK DATABASE STATUS            ")
            print("========================================")
            print(f"Total Users:    {len(users_count)}")
            print(f"Total Chats:    {len(chats_count)}")
            print(f"Total Messages: {len(messages_count)}")
            print("----------------------------------------")

            if users_count:
                print("\nActive Users:")
                for u in users_count[:10]:
                    roles = [r.name for r in u.roles] if hasattr(u, "roles") else []
                    print(f" - {u.email} ({u.status}, roles: {', '.join(roles)})")
                if len(users_count) > 10:
                    print(f" ... and {len(users_count) - 10} more")

            if chats_count:
                print("\nExisting Chats:")
                for c in chats_count[:10]:
                    name = c.name or "Private Chat"
                    print(f" - {name} (ID: {c.id}, group: {c.is_group})")
                if len(chats_count) > 10:
                    print(f" ... and {len(chats_count) - 10} more")
            print("========================================")

        except Exception as e:
            print(f"Error checking database status: {e}")


if __name__ == "__main__":
    asyncio.run(get_db_status())
