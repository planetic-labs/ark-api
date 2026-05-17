from pydantic import BaseModel, EmailStr, ConfigDict
from backend.modules.users.models import UserRole

class UserBaseSchema(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    is_active: bool
    is_approved: bool
    avatar_url: str | None = None

class UserSchema(UserBaseSchema):
    id: str
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdateSchema(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
