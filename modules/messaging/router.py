import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from modules.messaging.schemas import (
    ChatCreateSchema,
    ChatSchema,
    MessageCreateSchema,
    MessageSchema,
)
from modules.messaging.service import MessagingService
from modules.users.dependencies import require_approved_user
from modules.users.models import User

logger = structlog.get_logger()

router = APIRouter(prefix="/messaging", tags=["messaging"])

async def get_messaging_service(session: AsyncSession = Depends(get_session)) -> MessagingService:
    return MessagingService(session)

@router.post("/chats", response_model=ChatSchema)
async def create_chat(
    body: ChatCreateSchema,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service)
):
    return await service.create_chat(body, current_user.id)

@router.get("/chats", response_model=list[ChatSchema])
async def list_chats(
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service)
):
    logger.info("Listing chats for user", user_id=current_user.id)
    try:
        chats = await service.get_user_chats(current_user.id)
        logger.info("Found chats", count=len(chats))
        return chats
    except Exception as e:
        logger.error("Failed to list chats", error=str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/messages", response_model=MessageSchema)
async def send_message(
    body: MessageCreateSchema,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service)
):
    try:
        return await service.send_message(body, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/chats/{chat_id}/messages", response_model=list[MessageSchema])
async def get_messages(
    chat_id: str,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service)
):
    try:
        return await service.get_chat_messages(chat_id, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))
