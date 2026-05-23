from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Any

class UserBaseSchema(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str = "STUDENT"
    is_active: bool
    is_approved: bool
    avatar_url: str | None = None

class UserSchema(UserBaseSchema):
    id: str
    status: str = "created"
    roles: list[str] = []
    
    model_config = ConfigDict(from_attributes=True)

    @field_validator("roles", mode="before")
    @classmethod
    def serialize_roles(cls, v: Any) -> list[str]:
        if not v:
            return []
        return [r.name if hasattr(r, "name") else str(r) for r in v]

class UserUpdateSchema(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None

class UserCreateSchema(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str = "STUDENT"
    is_active: bool = True
    is_approved: bool = True
    avatar_url: str | None = None

