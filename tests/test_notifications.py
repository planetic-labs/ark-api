from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select

from modules.notifications.models import DeviceToken
from modules.notifications.service import (
    register_device_token,
    send_push_notifications,
    unregister_device_token,
)
from modules.users.models import User


@pytest.mark.asyncio
async def test_register_push_token_new_token_saves_successfully(db):
    # Setup: Create a test user
    user = User(
        email="push-user@ark.com",
        status="active",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    # Act
    token_str = "ExponentPushToken[1111111111111111111111]"
    device_token = await register_device_token(db, user.id, token_str)

    # Assert
    assert device_token.token == token_str
    assert device_token.user_id == user.id

    # Verify in DB
    res = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user.id))
    tokens = res.scalars().all()
    assert len(tokens) == 1
    assert tokens[0].token == token_str


@pytest.mark.asyncio
async def test_register_push_token_existing_token_reassigns_to_new_user(db):
    # Setup: Create two test users
    user1 = User(email="user1@ark.com", status="active", is_active=True)
    user2 = User(email="user2@ark.com", status="active", is_active=True)
    db.add_all([user1, user2])
    await db.commit()

    token_str = "ExponentPushToken[shared-token]"

    # Act: User1 registers first
    await register_device_token(db, user1.id, token_str)

    # User2 registers the same token
    device_token = await register_device_token(db, user2.id, token_str)

    # Assert
    assert device_token.token == token_str
    assert device_token.user_id == user2.id

    # Verify User1 doesn't have this token anymore, and User2 has it
    res1 = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user1.id))
    assert len(res1.scalars().all()) == 0

    res2 = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user2.id))
    tokens2 = res2.scalars().all()
    assert len(tokens2) == 1
    assert tokens2[0].token == token_str


@pytest.mark.asyncio
async def test_unregister_push_token_existing_token_deletes_successfully(db):
    # Setup: Create user and register token
    user = User(email="unreg@ark.com", status="active", is_active=True)
    db.add(user)
    await db.commit()

    token_str = "ExponentPushToken[delete-me]"
    await register_device_token(db, user.id, token_str)

    # Act
    await unregister_device_token(db, user.id, token_str)

    # Assert
    res = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user.id))
    assert len(res.scalars().all()) == 0


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_send_push_notifications_valid_tokens_sends_to_expo(mock_post, db):
    # Setup: Create user and register token
    user = User(email="send-push@ark.com", status="active", is_active=True)
    db.add(user)
    await db.commit()

    token_str = "ExponentPushToken[valid-token]"
    await register_device_token(db, user.id, token_str)

    # Mock success response from Expo
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": [{"status": "ok"}]}
    mock_post.return_value = mock_response

    # Act
    await send_push_notifications(
        session=db,
        user_ids=[user.id],
        title="Hello",
        body="World",
        sound="default",
        channel_id="siren_warrior",
        data={"screen": "chats"},
    )

    # Assert
    mock_post.assert_called_once()
    called_args, called_kwargs = mock_post.call_args
    assert called_kwargs["headers"] == {"Content-Type": "application/json"}

    payload = called_kwargs["json"]
    assert len(payload) == 1
    assert payload[0]["to"] == token_str
    assert payload[0]["title"] == "Hello"
    assert payload[0]["body"] == "World"
    assert payload[0]["sound"] == "default"
    assert payload[0]["channelId"] == "siren_warrior"
    assert payload[0]["data"] == {"screen": "chats"}


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_send_push_notifications_invalid_token_deletes_from_db(mock_post, db):
    # Setup: Create user and register token
    user = User(email="invalid-push@ark.com", status="active", is_active=True)
    db.add(user)
    await db.commit()

    token_str = "ExponentPushToken[invalid-token]"
    await register_device_token(db, user.id, token_str)

    # Mock error response from Expo saying device is not registered
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {
                "status": "error",
                "message": "DeviceNotRegistered",
                "details": {"error": "DeviceNotRegistered"},
            }
        ]
    }
    mock_post.return_value = mock_response

    # Act
    await send_push_notifications(
        session=db, user_ids=[user.id], title="Hello", body="World"
    )

    # Assert
    # Token should be deleted from DB because it is inactive
    res = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user.id))
    assert len(res.scalars().all()) == 0
