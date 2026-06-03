from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Any
from datetime import datetime

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


class UserAdminUpdateSchema(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    roles: list[str] | None = None
    personal_permissions: list[str] | None = None
    is_active: bool | None = None
    is_approved: bool | None = None
    status: str | None = None


class PermissionSchema(BaseModel):
    id: str
    key: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleCreateSchema(BaseModel):
    name: str
    permissions: list[str] = []


class RoleSchema(BaseModel):
    id: str
    name: str
    is_system: bool
    is_default: bool
    permissions: list[str] = []

    model_config = ConfigDict(from_attributes=True)

    @field_validator("permissions", mode="before")
    @classmethod
    def serialize_perms(cls, v: Any) -> list[str]:
        if not v:
            return []
        return [p.key if hasattr(p, "key") else str(p) for p in v]


class ServiceClientSchema(BaseModel):
    id: str
    name: str
    scopes: list[str]
    allowed_origins: list[str] | None = None
    created_at: datetime
    last_used_at: datetime | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ServiceClientCreateSchema(BaseModel):
    name: str
    scopes: list[str]
    allowed_origins: list[str] | None = None


class ServiceClientCreateResponseSchema(BaseModel):
    client: ServiceClientSchema
    token: str




