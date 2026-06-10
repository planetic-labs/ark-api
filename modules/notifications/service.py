import httpx
import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.notifications.models import DeviceToken

logger = structlog.get_logger()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def register_device_token(
    session: AsyncSession, user_id: str, push_token: str
) -> DeviceToken:
    """
    Register a push token for a user. If the token is already registered to
    another user, it will be reassigned to the new user.
    """
    # Check if this token already exists
    result = await session.execute(
        select(DeviceToken).where(DeviceToken.token == push_token)
    )
    existing_token = result.scalar_one_or_none()

    if existing_token:
        if existing_token.user_id == user_id:
            logger.info(
                "Push token already registered for this user",
                user_id=user_id,
                token=push_token,
            )
            return existing_token
        else:
            # Token registered to someone else. Reassign it.
            logger.info(
                "Reassigning push token to new user",
                old_user_id=existing_token.user_id,
                new_user_id=user_id,
                token=push_token,
            )
            existing_token.user_id = user_id
            await session.commit()
            await session.refresh(existing_token)
            return existing_token

    # Create new registration
    new_token = DeviceToken(user_id=user_id, token=push_token)
    session.add(new_token)
    await session.commit()
    await session.refresh(new_token)
    logger.info(
        "Successfully registered new push token", user_id=user_id, token=push_token
    )
    return new_token


async def unregister_device_token(
    session: AsyncSession, user_id: str, push_token: str
) -> None:
    """
    Unregister a push token.
    """
    await session.execute(
        delete(DeviceToken).where(
            DeviceToken.user_id == user_id, DeviceToken.token == push_token
        )
    )
    await session.commit()
    logger.info(
        "Successfully unregistered push token", user_id=user_id, token=push_token
    )


async def send_push_notifications(
    session: AsyncSession,
    user_ids: list[str],
    title: str,
    body: str,
    sound: str | None = "default",
    channel_id: str | None = None,
    data: dict[str, str] | None = None,
) -> None:
    """
    Send push notifications to a list of user IDs via Expo Push API.
    Splits recipients into batches of 100 (Expo limit) and handles invalid tokens.
    """
    if not user_ids:
        return

    # Fetch tokens for these users
    result = await session.execute(
        select(DeviceToken).where(DeviceToken.user_id.in_(user_ids))
    )
    device_tokens = result.scalars().all()

    if not device_tokens:
        logger.info("No registered push tokens found for users", user_ids=user_ids)
        return

    tokens = [dt.token for dt in device_tokens]

    # Map tokens to DeviceToken objects for quick lookup/cleanup later
    token_to_device = {dt.token: dt for dt in device_tokens}

    # Expo allows sending to up to 100 tokens per request
    chunk_size = 100
    batches = [tokens[i : i + chunk_size] for i in range(0, len(tokens), chunk_size)]

    async with httpx.AsyncClient() as client:
        for batch in batches:
            payload = []
            for token in batch:
                msg = {
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": sound,
                }
                if channel_id:
                    msg["channelId"] = channel_id
                if data:
                    msg["data"] = data
                payload.append(msg)

            try:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10.0,
                )
                if response.status_code != 200:
                    logger.error(
                        "Failed to send push batch to Expo",
                        status_code=response.status_code,
                        response=response.text,
                    )
                    continue

                res_json = response.json()
                data_list = res_json.get("data", [])

                # Process results to clean up inactive tokens
                # Expo returns array matching the order of sent messages
                for token, result_info in zip(batch, data_list, strict=True):
                    status = result_info.get("status")
                    if status == "error":
                        details = result_info.get("details", {})
                        error_code = details.get("error")
                        logger.warning(
                            "Expo push delivery error",
                            token=token,
                            error=result_info.get("message"),
                            code=error_code,
                        )
                        # If device is not registered, delete it from our DB
                        if error_code == "DeviceNotRegistered":
                            device_to_delete = token_to_device.get(token)
                            if device_to_delete:
                                await session.delete(device_to_delete)
                                logger.info(
                                    "Removed unregistered token from database",
                                    token=token,
                                    user_id=device_to_delete.user_id,
                                )

                await session.commit()

            except Exception as e:
                logger.error(
                    "Error occurred while sending push notifications", error=str(e)
                )
