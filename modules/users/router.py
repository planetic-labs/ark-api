from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from modules.notifications.schemas import DeviceTokenCreate
from modules.notifications.service import register_device_token, unregister_device_token
from modules.users.dependencies import (
    get_current_user,
    get_users_service,
    require_approved_user,
    require_role,
)
from modules.users.models import User
from modules.users.schemas import (
    UserAdminUpdateSchema,
    UserCreateSchema,
    UserSchema,
)
from modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile.
    """
    return current_user


@router.post("/me/push-token")
async def register_user_push_token(
    body: DeviceTokenCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Register user device push token.
    """
    await register_device_token(
        session=session, user_id=current_user.id, push_token=body.push_token
    )
    return {"message": "Push token registered successfully"}


@router.delete("/me/push-token")
async def unregister_user_push_token(
    push_token: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Unregister user device push token.
    """
    await unregister_device_token(
        session=session, user_id=current_user.id, push_token=push_token
    )
    return {"message": "Push token unregistered successfully"}


@router.get("", response_model=list[UserSchema])
async def list_users(
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_approved_user),
):
    """
    List all users in the system.
    """
    return await service.list_users()


@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreateSchema,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Create a new user (admin only).
    """
    return await service.create_user(body)


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: str,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_approved_user),
):
    """
    Get user by ID.
    """
    return await service.get_user(user_id)


@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    body: UserAdminUpdateSchema,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Update user profile, status, roles and permissions (admin only).
    """
    return await service.update_user(user_id, body)


@router.delete("/{user_id}", response_model=UserSchema)
async def delete_user(
    user_id: str,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Disable and soft delete a user (admin only).
    """
    return await service.delete_user(user_id)
