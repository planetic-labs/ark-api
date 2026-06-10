from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceTokenCreate(BaseModel):
    push_token: str = Field(
        ..., description="Expo push token starting with ExponentPushToken"
    )


class DeviceTokenSchema(BaseModel):
    id: str
    user_id: str
    token: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PushPayload(BaseModel):
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body content")
    sound: str | None = Field(
        "default", description="Sound to play ('default' or custom sound name)"
    )
    channel_id: str | None = Field(None, description="Android notification channel ID")
    data: dict[str, str] | None = Field(None, description="Additional payload metadata")
