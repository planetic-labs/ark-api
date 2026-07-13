import structlog
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from modules.messaging.schemas import (
    ChatCreateSchema,
    ChatSchema,
    MessageCreateSchema,
    MessageSchema,
    MessageReceiptUpdateSchema,
)
from modules.messaging.service import MessagingService
from modules.users.dependencies import require_approved_user
from modules.users.models import User

logger = structlog.get_logger()

router = APIRouter(prefix="/messaging", tags=["messaging"])


async def get_messaging_service(
    session: AsyncSession = Depends(get_session),
) -> MessagingService:
    return MessagingService(session)


@router.post("/chats", response_model=ChatSchema)
async def create_chat(
    body: ChatCreateSchema,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service),
):
    return await service.create_chat(body, current_user.id)


@router.get("/chats", response_model=list[ChatSchema])
async def list_chats(
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service),
):
    return await service.get_user_chats(current_user.id)


@router.post("/messages", response_model=MessageSchema)
async def send_message(
    body: MessageCreateSchema,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service),
):
    return await service.send_message(body, current_user.id)


@router.get("/chats/{chat_id}/messages", response_model=list[MessageSchema])
async def get_messages(
    chat_id: str,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service),
):
    return await service.get_chat_messages(chat_id, current_user.id)


@router.post("/attachments/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(require_approved_user),
):
    os.makedirs("static/uploads", exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join("static/uploads", filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    return {"file_url": f"/static/uploads/{filename}"}


@router.post("/messages/receipts")
async def update_message_receipts(
    body: MessageReceiptUpdateSchema,
    current_user: User = Depends(require_approved_user),
    service: MessagingService = Depends(get_messaging_service),
):
    await service.update_message_receipts(body.message_ids, current_user.id, body.status)
    return {"message": "Receipts updated successfully"}
