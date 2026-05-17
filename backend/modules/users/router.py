from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_session
from backend.modules.users.dependencies import get_current_user
from backend.modules.users.models import User
from backend.modules.users.schemas import UserSchema

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
    current_user: User = Depends(get_current_user)
):
    """
    List all users in the system.
    """
    result = await session.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.full_name)
    )
    return result.scalars().all()
