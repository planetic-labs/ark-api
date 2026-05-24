import asyncio
from sqlalchemy import select
from backend.core.database import AsyncSessionLocal
from backend.modules.users.models import User, Role

async def add_user(email: str):
    email = email.strip().lower()
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            print(f"User with email '{email}' already exists: id={existing_user.id}")
            return

        # Find student (default) role
        result = await session.execute(select(Role).where(Role.is_default == True))
        role = result.scalar_one_or_none()
        if not role:
            result = await session.execute(select(Role).where(Role.name == "student"))
            role = result.scalar_one_or_none()
        
        if not role:
            # Create student role if not found
            role = Role(name="student", is_system=False, is_default=True)
            session.add(role)
            await session.flush()
            print("Created default role 'student'")

        # Create new user
        user = User(
            email=email,
            is_active=True,
            is_approved=True,
            email_verified=True,
            status="active"
        )
        user.full_name = email.split("@")[0].capitalize()
        user.roles.append(role)
        
        session.add(user)
        await session.commit()
        print(f"Successfully added user: {email} (role: {role.name})")

if __name__ == "__main__":
    import sys
    email = "prusikov@gmail.com"
    if len(sys.argv) > 1:
        email = sys.argv[1]
    asyncio.run(add_user(email))
