from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import get_session
from backend.modules.auth.schemas import (
    RequestCodeSchema, VerifyCodeSchema, TokenSchema, MsgSchema, RefreshTokenSchema
)
from backend.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)

@router.post("/request-code", response_model=MsgSchema)
async def request_code(
    body: RequestCodeSchema,
    service: AuthService = Depends(get_auth_service)
):
    await service.request_code(body.email)
    return {"message": "Auth code sent to email"}

@router.post("/verify-code", response_model=TokenSchema)
async def verify_code(
    body: VerifyCodeSchema,
    service: AuthService = Depends(get_auth_service)
):
    tokens = await service.verify_code(body.email, body.code)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid code or email"
        )
    return tokens

@router.post("/refresh", response_model=TokenSchema)
async def refresh_token(
    body: RefreshTokenSchema,
    service: AuthService = Depends(get_auth_service)
):
    tokens = await service.refresh_token(body.refresh_token)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    return tokens
