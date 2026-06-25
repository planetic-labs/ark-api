import hashlib
import secrets
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from modules.users.exceptions import (
    RoleAlreadyExistsError,
    RoleNotFoundError,
    ServiceClientNotFoundError,
    SystemRoleModificationError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from modules.users.models import Permission, Role, ServiceClient, User
from modules.users.repository import (
    PermissionRepository,
    RoleRepository,
    ServiceClientRepository,
    UserRepository,
)
from modules.users.schemas import (
    RoleCreateSchema,
    ServiceClientCreateSchema,
    UserAdminUpdateSchema,
    UserCreateSchema,
)


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.role_repo = RoleRepository(session)
        self.perm_repo = PermissionRepository(session)
        self.client_repo = ServiceClientRepository(session)

    async def get_user(self, user_id: str) -> User:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError()
        return user

    async def list_users(self) -> list[User]:
        return await self.user_repo.list_users()

    async def create_user(self, body: UserCreateSchema) -> User:
        existing = await self.user_repo.get_user_by_email(body.email)
        if existing:
            raise UserAlreadyExistsError()

        role_name = body.role.lower()
        role_obj = await self.role_repo.get_role_by_name(role_name)
        if not role_obj:
            role_obj = Role(name=body.role, is_default=False, is_system=False)
            await self.role_repo.add(role_obj)
            await self.role_repo.flush()

        new_user = User(
            email=body.email,
            is_active=body.is_active,
            is_approved=body.is_approved,
            avatar_url=body.avatar_url,
            status="active" if body.is_approved else "created",
        )
        if body.first_name is not None:
            new_user.first_name = body.first_name
        if body.last_name is not None:
            new_user.last_name = body.last_name
        if body.full_name is not None and not (body.first_name or body.last_name):
            new_user.full_name = body.full_name
        new_user.roles.append(role_obj)

        await self.user_repo.add(new_user)
        await self.user_repo.commit()
        await self.user_repo.refresh(new_user)
        return new_user

    async def update_user(self, user_id: str, body: UserAdminUpdateSchema) -> User:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError()

        if body.first_name is not None:
            user.first_name = body.first_name
        if body.last_name is not None:
            user.last_name = body.last_name
        if body.full_name is not None and not (body.first_name or body.last_name):
            user.full_name = body.full_name
        if body.avatar_url is not None:
            user.avatar_url = body.avatar_url
        if body.is_active is not None:
            user.is_active = body.is_active
        if body.is_approved is not None:
            user.is_approved = body.is_approved
            user.status = "active" if body.is_approved else "created"
        if body.status is not None:
            user.status = body.status

        if body.is_active is False or body.status == "disabled":
            from modules.auth.models import RefreshToken

            await self.session.execute(
                sa.delete(RefreshToken).where(RefreshToken.user_id == user_id)
            )

        if body.roles is not None:
            user.roles = []
            for r_name in body.roles:
                r_obj = await self.role_repo.get_role_by_name(r_name)
                if not r_obj:
                    r_obj = Role(name=r_name, is_default=False, is_system=False)
                    await self.role_repo.add(r_obj)
                    await self.role_repo.flush()
                user.roles.append(r_obj)

        if body.personal_permissions is not None:
            user.personal_permissions = []
            for p_key in body.personal_permissions:
                p_obj = await self.perm_repo.get_permission_by_key(p_key)
                if not p_obj:
                    p_obj = Permission(key=p_key, description=f"Permission {p_key}")
                    await self.perm_repo.add(p_obj)
                    await self.role_repo.flush()
                user.personal_permissions.append(p_obj)

        await self.user_repo.commit()
        await self.user_repo.refresh(user)
        return user

    async def delete_user(self, user_id: str) -> User:
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError()

        user.is_active = False
        user.status = "disabled"
        user.deleted_at = datetime.now(UTC)

        from modules.auth.models import RefreshToken

        await self.session.execute(
            sa.delete(RefreshToken).where(RefreshToken.user_id == user_id)
        )

        await self.user_repo.commit()
        return user

    async def list_roles(self) -> list[Role]:
        return await self.role_repo.list_roles()

    async def create_role(self, body: RoleCreateSchema) -> Role:
        existing = await self.role_repo.get_role_by_name(body.name)
        if existing:
            raise RoleAlreadyExistsError()

        role = Role(name=body.name, is_system=False, is_default=False)
        await self.role_repo.add(role)
        await self.role_repo.flush()

        for p_key in body.permissions:
            p_obj = await self.perm_repo.get_permission_by_key(p_key)
            if not p_obj:
                p_obj = Permission(key=p_key, description=f"Permission {p_key}")
                await self.perm_repo.add(p_obj)
                await self.role_repo.flush()
            role.permissions.append(p_obj)

        await self.user_repo.commit()
        await self.user_repo.refresh(role)
        return role

    async def update_role(self, role_id: str, body: RoleCreateSchema) -> Role:
        role = await self.role_repo.get_role_by_id(role_id)
        if not role:
            raise RoleNotFoundError()
        if role.is_system or role.name.lower() == "admin":
            raise SystemRoleModificationError()

        role.name = body.name
        role.permissions = []

        for p_key in body.permissions:
            p_obj = await self.perm_repo.get_permission_by_key(p_key)
            if not p_obj:
                p_obj = Permission(key=p_key, description=f"Permission {p_key}")
                await self.perm_repo.add(p_obj)
                await self.role_repo.flush()
            role.permissions.append(p_obj)

        await self.user_repo.commit()
        await self.user_repo.refresh(role)
        return role

    async def make_default_role(self, role_id: str) -> Role:
        role = await self.role_repo.get_role_by_id(role_id)
        if not role:
            raise RoleNotFoundError()

        await self.role_repo.remove_default_roles()
        role.is_default = True
        await self.user_repo.commit()
        await self.user_repo.refresh(role)
        return role

    async def list_permissions(self) -> list[Permission]:
        permissions = await self.perm_repo.list_permissions()
        if not permissions:
            default_keys = [
                "read:chats",
                "write:messages",
                "create:chats",
                "manage:users",
                "manage:roles",
                "manage:services",
                "manage:bots",
                "read:video",
                "read:materials",
                "write:reports",
                "write:corrections",
            ]
            for key in default_keys:
                p = Permission(key=key, description=f"Allows {key.replace(':', ' ')}")
                await self.perm_repo.add(p)
            await self.user_repo.commit()
            permissions = await self.perm_repo.list_permissions()
        return permissions

    async def list_services(self) -> list[ServiceClient]:
        return await self.client_repo.list_services()

    async def create_service(
        self, body: ServiceClientCreateSchema
    ) -> tuple[ServiceClient, str]:
        raw_token = f"svc_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        client = ServiceClient(
            name=body.name,
            token_hash=token_hash,
            scopes=body.scopes,
            allowed_origins=body.allowed_origins or [],
            is_active=True,
        )

        await self.client_repo.add(client)
        await self.user_repo.commit()
        await self.user_repo.refresh(client)
        return client, raw_token

    async def revoke_service(self, client_id: str) -> ServiceClient:
        client = await self.client_repo.get_service_by_id(client_id)
        if not client:
            raise ServiceClientNotFoundError()

        client.is_active = False
        await self.user_repo.commit()
        await self.user_repo.refresh(client)
        return client

    async def activate_service(self, client_id: str) -> ServiceClient:
        client = await self.client_repo.get_service_by_id(client_id)
        if not client:
            raise ServiceClientNotFoundError()

        client.is_active = True
        await self.user_repo.commit()
        await self.user_repo.refresh(client)
        return client
