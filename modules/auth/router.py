from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from core.security import decode_token
from modules.auth.schemas import (
    IdentifyResponseSchema,
    IdentifySchema,
    MsgSchema,
    RefreshTokenSchema,
    SetupProfileSchema,
    TokenResponseSchema,
    VerifyCodeResponseSchema,
    VerifyCodeSchema,
)
from modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)

@router.post("/identify", response_model=IdentifyResponseSchema, response_model_exclude_none=True)
async def identify(
    body: IdentifySchema,
    service: AuthService = Depends(get_auth_service)
):
    # returns {"next": "enter_code"} or {"error": "not_found"}
    return await service.identify(body.email)

@router.post("/verify-code", response_model=VerifyCodeResponseSchema, response_model_exclude_none=True)
async def verify_code(
    body: VerifyCodeSchema,
    service: AuthService = Depends(get_auth_service)
):
    result = await service.verify_code(body.email, body.code)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid code or email"
        )
    return result

@router.post("/setup", response_model=TokenResponseSchema)
async def setup(
    body: SetupProfileSchema,
    service: AuthService = Depends(get_auth_service)
):
    result = await service.setup(body.setup_token, body.first_name, body.last_name, body.avatar_url)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid setup token or user is disabled"
        )
    return result

@router.post("/refresh", response_model=TokenResponseSchema)
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

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/verify-code", auto_error=False)

@router.post("/logout", response_model=MsgSchema)
async def logout(
    body: RefreshTokenSchema | None = None,
    token: str | None = Depends(oauth2_scheme_optional),
    service: AuthService = Depends(get_auth_service)
):
    jti = None
    if token:
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
        except Exception:
            pass
            
    refresh_token_str = body.refresh_token if body else None
    
    if not jti and not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a valid access token or a refresh token must be provided"
        )
        
    await service.logout(jti=jti, refresh_token_str=refresh_token_str)
    return {"message": "Logged out successfully"}

