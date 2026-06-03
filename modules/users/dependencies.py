from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.config import settings
from backend.core.database import get_session
from backend.core.security import decode_token
from backend.modules.users.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/auth/verify-code")

import structlog
logger = structlog.get_logger()

async def get_current_user(
    session: AsyncSession = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.error("Token payload missing 'sub' claim")
            raise credentials_exception
    except jwt.PyJWTError as e:
        logger.error("JWT decoding failed", error=str(e))
        raise credentials_exception
        
    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        logger.error("User not found for token", user_id=user_id)
        raise credentials_exception
    
    if not user.is_active or user.status == 'disabled':
        logger.warning("Inactive or disabled user attempted access", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or disabled"
        )
        
    return user

def require_role(role_name: str):
    async def role_checker(current_user: User = Depends(get_current_user)):
        # Admin is system-wide bypass and has all roles
        if any(role.name == "admin" for role in current_user.roles):
            return current_user
        if not any(role.name == role_name for role in current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required"
            )
        return current_user
    return role_checker

async def require_approved_user(current_user: User = Depends(get_current_user)):
    # Admin roles are always approved/bypassed
    if any(role.name == "admin" for role in current_user.roles):
        return current_user
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account not approved by administrator"
        )
    return current_user

def require_permission(permission_key: str):
    async def permission_checker(current_user: User = Depends(get_current_user)):
        # Admin has all permissions
        if any(role.name == "admin" for role in current_user.roles):
            return current_user
            
        user_permissions = set()
        # Add permissions from all user's roles
        for role in current_user.roles:
            for perm in role.permissions:
                user_permissions.add(perm.key)
                
        # Add personal user-specific permissions
        for perm in current_user.personal_permissions:
            user_permissions.add(perm.key)
            
        if permission_key not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_key}' required"
            )
        return current_user
    return permission_checker

