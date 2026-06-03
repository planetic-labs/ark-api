from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_session
from backend.modules.users.dependencies import get_current_user, require_role, require_approved_user
from backend.modules.users.models import User, Role
from backend.modules.users.schemas import UserSchema, UserCreateSchema, UserAdminUpdateSchema, RoleSchema, RoleCreateSchema, PermissionSchema, ServiceClientSchema, ServiceClientCreateSchema, ServiceClientCreateResponseSchema
from backend.modules.users.models import User, Role, Permission, ServiceClient

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile.
    """
    return current_user

@router.get("", response_model=list[UserSchema])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_approved_user)
):
    """
    List all users in the system.
    """
    result = await session.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.first_name, User.last_name)
    )
    return result.scalars().all()

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Create a new user (admin only).
    """
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    role_name = body.role.lower()
    role_result = await session.execute(select(Role).where(sa.func.lower(Role.name) == role_name))
    role_obj = role_result.scalar_one_or_none()
    if not role_obj:
        role_obj = Role(name=body.role, is_default=False, is_system=False)
        session.add(role_obj)
        await session.flush()
    
    new_user = User(
        email=body.email,
        is_active=body.is_active,
        is_approved=body.is_approved,
        avatar_url=body.avatar_url,
        status="active" if body.is_approved else "created"
    )
    if body.first_name is not None:
        new_user.first_name = body.first_name
    if body.last_name is not None:
        new_user.last_name = body.last_name
    if body.full_name is not None and not (body.first_name or body.last_name):
        new_user.full_name = body.full_name
    new_user.roles.append(role_obj)
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_approved_user)
):
    """
    Get user by ID.
    """
    result = await session.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    body: UserAdminUpdateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Update user profile, status, roles and permissions (admin only).
    """
    result = await session.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
        from backend.modules.auth.models import RefreshToken
        await session.execute(
            sa.delete(RefreshToken).where(RefreshToken.user_id == user_id)
        )
        
    if body.roles is not None:
        user.roles = []
        for r_name in body.roles:
            role_res = await session.execute(select(Role).where(sa.func.lower(Role.name) == r_name.lower()))
            r_obj = role_res.scalar_one_or_none()
            if not r_obj:
                r_obj = Role(name=r_name, is_default=False, is_system=False)
                session.add(r_obj)
                await session.flush()
            user.roles.append(r_obj)
            
    if body.personal_permissions is not None:
        user.personal_permissions = []
        for p_key in body.personal_permissions:
            perm_res = await session.execute(select(Permission).where(Permission.key == p_key))
            p_obj = perm_res.scalar_one_or_none()
            if not p_obj:
                p_obj = Permission(key=p_key, description=f"Permission {p_key}")
                session.add(p_obj)
                await session.flush()
            user.personal_permissions.append(p_obj)
            
    await session.commit()
    await session.refresh(user)
    return user

@router.delete("/{user_id}", response_model=UserSchema)
async def delete_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Disable and soft delete a user (admin only).
    """
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = False
    user.status = "disabled"
    from datetime import datetime
    user.deleted_at = datetime.utcnow()
    
    from backend.modules.auth.models import RefreshToken
    await session.execute(
        sa.delete(RefreshToken).where(RefreshToken.user_id == user_id)
    )
    
    await session.commit()
    return user


@router.get("/roles/list", response_model=list[RoleSchema])
async def list_roles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_approved_user)
):
    """
    List all roles in the system.
    """
    result = await session.execute(select(Role).order_by(Role.name))
    return result.scalars().all()

@router.post("/roles/create", response_model=RoleSchema)
async def create_role(
    body: RoleCreateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Create a new role with permissions (admin only).
    """
    existing = await session.execute(select(Role).where(sa.func.lower(Role.name) == body.name.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already exists")
        
    role = Role(name=body.name, is_system=False, is_default=False)
    session.add(role)
    await session.flush()
    
    for p_key in body.permissions:
        perm_res = await session.execute(select(Permission).where(Permission.key == p_key))
        p_obj = perm_res.scalar_one_or_none()
        if not p_obj:
            p_obj = Permission(key=p_key, description=f"Permission {p_key}")
            session.add(p_obj)
            await session.flush()
        role.permissions.append(p_obj)
        
    await session.commit()
    await session.refresh(role)
    return role

@router.patch("/roles/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: str,
    body: RoleCreateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Update a role and its permissions (admin only).
    """
    result = await session.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_system or role.name.lower() == "admin":
        raise HTTPException(status_code=400, detail="System roles cannot be modified")
        
    role.name = body.name
    role.permissions = []
    
    for p_key in body.permissions:
        perm_res = await session.execute(select(Permission).where(Permission.key == p_key))
        p_obj = perm_res.scalar_one_or_none()
        if not p_obj:
            p_obj = Permission(key=p_key, description=f"Permission {p_key}")
            session.add(p_obj)
            await session.flush()
        role.permissions.append(p_obj)
        
    await session.commit()
    await session.refresh(role)
    return role

@router.post("/roles/{role_id}/default", response_model=RoleSchema)
async def make_default_role(
    role_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Set a role as default (admin only).
    """
    result = await session.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    # Снять флаг с текущей роли по умолчанию
    await session.execute(
        sa.update(Role).where(Role.is_default == True).values(is_default=False)
    )
    
    role.is_default = True
    await session.commit()
    await session.refresh(role)
    return role

@router.get("/permissions/list", response_model=list[PermissionSchema])
async def list_permissions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_approved_user)
):
    """
    List all permissions in the system.
    """
    result = await session.execute(select(Permission).order_by(Permission.key))
    permissions = result.scalars().all()
    
    # Если прав в бд нет, вернем дефолтный список для удобства
    if not permissions:
        default_keys = [
            "read:chats", "write:messages", "create:chats", "manage:users", 
            "manage:roles", "manage:services", "manage:bots", "read:video", 
            "read:materials", "write:reports", "write:corrections"
        ]
        for key in default_keys:
            p = Permission(key=key, description=f"Allows {key.replace(':', ' ')}")
            session.add(p)
        await session.commit()
        result = await session.execute(select(Permission).order_by(Permission.key))
        permissions = result.scalars().all()
        
    return permissions


import secrets
import hashlib

@router.get("/services/list", response_model=list[ServiceClientSchema])
async def list_services(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    List all service clients (admin only).
    """
    result = await session.execute(select(ServiceClient).order_by(ServiceClient.name))
    return result.scalars().all()

@router.post("/services/create", response_model=ServiceClientCreateResponseSchema)
async def create_service(
    body: ServiceClientCreateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Create a new service client and generate a secret token (admin only).
    """
    raw_token = f"svc_{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    client = ServiceClient(
        name=body.name,
        token_hash=token_hash,
        scopes=body.scopes,
        allowed_origins=body.allowed_origins or [],
        is_active=True
    )
    
    session.add(client)
    await session.commit()
    await session.refresh(client)
    
    return {
        "client": client,
        "token": raw_token
    }

@router.post("/services/{client_id}/revoke", response_model=ServiceClientSchema)
async def revoke_service(
    client_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Revoke/deactivate a service client (admin only).
    """
    result = await session.execute(select(ServiceClient).where(ServiceClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Service client not found")
        
    client.is_active = False
    await session.commit()
    await session.refresh(client)
    return client

@router.post("/services/{client_id}/activate", response_model=ServiceClientSchema)
async def activate_service(
    client_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_role("admin"))
):
    """
    Activate a service client (admin only).
    """
    result = await session.execute(select(ServiceClient).where(ServiceClient.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Service client not found")
        
    client.is_active = True
    await session.commit()
    await session.refresh(client)
    return client




