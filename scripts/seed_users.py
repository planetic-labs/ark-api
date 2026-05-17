import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import AsyncSessionLocal
from backend.modules.users.models import User, UserRole

async def seed_users():
    async with AsyncSessionLocal() as session:
        test_users = [
            User(
                email="master@ark.com",
                full_name="Master Yoda",
                role=UserRole.MASTER,
                is_approved=True,
                is_active=True
            ),
            User(
                email="warrior@ark.com",
                full_name="Luke Skywalker",
                role=UserRole.WARRIOR,
                is_approved=True,
                is_active=True
            )
        ]
        
        for user in test_users:
            # Check if user already exists
            from sqlalchemy import select
            result = await session.execute(select(User).where(User.email == user.email))
            if not result.scalar_one_or_none():
                session.add(user)
                print(f"Added test user: {user.email}")
            else:
                print(f"User {user.email} already exists")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_users())
