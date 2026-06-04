import asyncio
from sqlalchemy import select, delete
from core.database import AsyncSessionLocal
from modules.messaging.models import Chat
from modules.users.models import User # Ensure User model is loaded for SQLAlchemy mapping

async def main():
    async with AsyncSessionLocal() as session:
        # Get all group chats ordered by creation date
        result = await session.execute(
            select(Chat).where(Chat.is_group == True).order_by(Chat.created_at.asc())
        )
        chats = result.scalars().all()
        
        seen_names = set()
        to_delete = []
        
        for chat in chats:
            if not chat.name:
                continue
            if chat.name in seen_names:
                to_delete.append(chat.id)
            else:
                seen_names.add(chat.name)
        
        if to_delete:
            print(f"Found {len(to_delete)} duplicate chats to delete.")
            # Delete in chunks
            chunk_size = 500
            for i in range(0, len(to_delete), chunk_size):
                chunk = to_delete[i:i + chunk_size]
                await session.execute(
                    delete(Chat).where(Chat.id.in_(chunk))
                )
            await session.commit()
            print("Successfully deleted duplicates.")
        else:
            print("No duplicate chats found.")

if __name__ == "__main__":
    asyncio.run(main())
