from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_session
from backend.modules.users.dependencies import get_current_user, require_role, require_approved_user
from backend.modules.users.models import User, Role
from backend.modules.users.schemas import UserSchema, UserCreateSchema

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user profile.
    """
    return current_user

@router.get("/", response_model=list[UserSchema])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_approved_user)
):
    """
    List all users in the system.
    """
    result = await session.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.name)
    )
    return result.scalars().all()

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
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
    new_user.full_name = body.full_name or ""
    new_user.roles.append(role_obj)
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

