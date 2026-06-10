from datetime import datetime

from pydantic import BaseModel, ConfigDict

from modules.users.schemas import UserSchema


class ChatBaseSchema(BaseModel):
    name: str | None = None
    is_group: bool = False


class ChatCreateSchema(ChatBaseSchema):
    member_ids: list[str]


class ChatSchema(ChatBaseSchema):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageBaseSchema(BaseModel):
    content: str
    chat_id: str
    parent_id: str | None = None


class MessageCreateSchema(MessageBaseSchema):
    pass


class MessageSchema(MessageBaseSchema):
    id: str
    sender_id: str
    sender: UserSchema | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
