from pydantic import BaseModel, EmailStr, Field

class RequestCodeSchema(BaseModel):
    email: EmailStr

class VerifyCodeSchema(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class MsgSchema(BaseModel):
    message: str

class RefreshTokenSchema(BaseModel):
    refresh_token: str
