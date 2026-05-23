from pydantic import BaseModel, EmailStr, Field

class IdentifySchema(BaseModel):
    email: EmailStr

class IdentifyResponseSchema(BaseModel):
    next: str | None = None
    error: str | None = None

class VerifyCodeSchema(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

class VerifyCodeResponseSchema(BaseModel):
    next: str
    setup_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None

class SetupProfileSchema(BaseModel):
    setup_token: str
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: str | None = None

class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int

class RefreshTokenSchema(BaseModel):
    refresh_token: str

class MsgSchema(BaseModel):
    message: str

