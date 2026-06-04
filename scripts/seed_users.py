import asyncio

from sqlalchemy import select

from core.database import AsyncSessionLocal
from modules.users.models import Role, User


async def seed_users():
    async with AsyncSessionLocal() as session:
        # Define roles to ensure they exist
        roles_to_create = ["admin", "master", "warrior", "student"]
        roles_map = {}
        for role_name in roles_to_create:
            result = await session.execute(select(Role).where(Role.name == role_name))
            role_obj = result.scalar_one_or_none()
            if not role_obj:
                role_obj = Role(name=role_name, is_system=(role_name == "admin"), is_default=(role_name == "student"))
                session.add(role_obj)
                await session.flush()
            roles_map[role_name] = role_obj

        test_users_data = [
            {
                "email": "master@ark.com",
                "full_name": "Master Yoda",
                "role_name": "master",
                "is_approved": True,
                "is_active": True
            },
            {
                "email": "warrior@ark.com",
                "full_name": "Luke Skywalker",
                "role_name": "warrior",
                "is_approved": True,
                "is_active": True
            }
        ]
        
        for data in test_users_data:
            result = await session.execute(select(User).where(User.email == data["email"]))
            existing_user = result.scalar_one_or_none()
            if not existing_user:
                user = User(
                    email=data["email"],
                    is_approved=data["is_approved"],
                    is_active=data["is_active"],
                    status="active"
                )
                user.full_name = data["full_name"]
                user.roles.append(roles_map[data["role_name"]])
                session.add(user)
                print(f"Added test user: {user.email}")
            else:
                # Ensure status is active and roles match
                existing_user.status = "active"
                if not any(r.name == data["role_name"] for r in existing_user.roles):
                    existing_user.roles.append(roles_map[data["role_name"]])
                print(f"User {data['email']} already exists (updated role/status)")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_users())

