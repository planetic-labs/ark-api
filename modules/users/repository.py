from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from modules.users.models import Permission, Role, ServiceClient, User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_id(self, user_id: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def list_users(self) -> list[User]:
        result = await self.session.execute(
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.first_name, User.last_name)
        )
        return list(result.scalars().all())

    async def add(self, user: User) -> None:
        self.session.add(user)

    async def flush(self) -> None:
        await self.session.flush()

    async def commit(self) -> None:
        await self.session.commit()

    async def refresh(self, obj, attribute_names=None) -> None:
        await self.session.refresh(obj, attribute_names)


class RoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_role_by_id(self, role_id: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.id == role_id))
        return result.scalar_one_or_none()

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(func.lower(Role.name) == name.lower())
        )
        return result.scalar_one_or_none()

    async def list_roles(self) -> list[Role]:
        result = await self.session.execute(select(Role).order_by(Role.name))
        return list(result.scalars().all())

    async def remove_default_roles(self) -> None:
        await self.session.execute(
            update(Role).where(Role.is_default).values(is_default=False)
        )

    async def add(self, role: Role) -> None:
        self.session.add(role)

    async def flush(self) -> None:
        await self.session.flush()


class PermissionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_permission_by_key(self, key: str) -> Permission | None:
        result = await self.session.execute(
            select(Permission).where(Permission.key == key)
        )
        return result.scalar_one_or_none()

    async def list_permissions(self) -> list[Permission]:
        result = await self.session.execute(select(Permission).order_by(Permission.key))
        return list(result.scalars().all())

    async def add(self, permission: Permission) -> None:
        self.session.add(permission)


class ServiceClientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_service_by_id(self, client_id: str) -> ServiceClient | None:
        result = await self.session.execute(
            select(ServiceClient).where(ServiceClient.id == client_id)
        )
        return result.scalar_one_or_none()

    async def list_services(self) -> list[ServiceClient]:
        result = await self.session.execute(
            select(ServiceClient).order_by(ServiceClient.name)
        )
        return list(result.scalars().all())

    async def add(self, client: ServiceClient) -> None:
        self.session.add(client)
