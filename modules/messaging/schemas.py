from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from modules.users.schemas import UserSchema


class MessageBaseSchema(BaseModel):
    content: str | None = Field(None, max_length=4000)
    chat_id: str
    parent_id: str | None = None
    message_type: str = "text"
    file_url: str | None = None
    duration: int | None = None
    sticker_id: str | None = None


class MessageCreateSchema(MessageBaseSchema):
    pass


class MessageSchema(MessageBaseSchema):
    id: str
    sender_id: str
    sender: UserSchema | None = None
    created_at: datetime
    status: str = "sent"  # sent, delivered, read

    model_config = ConfigDict(from_attributes=True)


class ChatBaseSchema(BaseModel):
    name: str | None = None
    is_group: bool = False


class ChatCreateSchema(ChatBaseSchema):
    member_ids: list[str]


class ChatSchema(ChatBaseSchema):
    id: str
    created_at: datetime
    members: list[UserSchema] = []
    last_message: MessageSchema | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageReceiptSchema(BaseModel):
    message_id: str
    user_id: str
    status: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageReceiptUpdateSchema(BaseModel):
    message_ids: list[str]
    status: str  # delivered, read
