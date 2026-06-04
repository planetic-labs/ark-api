import asyncio
import json

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.messaging.models import Chat, Message, chat_members
from modules.messaging.schemas import (
    ChatCreateSchema,
    MessageCreateSchema,
    MessageSchema,
)


class MessagingService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_chat(self, body: ChatCreateSchema, creator_id: str) -> Chat:
        if not body.is_group and len(body.member_ids) == 1:
            other_id = body.member_ids[0]
            stmt = select(Chat).join(chat_members).where(
                and_(
                    Chat.is_group == False,
                    chat_members.c.user_id.in_([creator_id, other_id])
                )
            ).group_by(Chat.id).having(func.count(Chat.id) == 2)
            
            result = await self.session.execute(stmt)
            existing_chat = result.scalar_one_or_none()
            if existing_chat:
                return existing_chat

        chat = Chat(name=body.name, is_group=body.is_group)
        self.session.add(chat)
        await self.session.flush()

        all_member_ids = set(body.member_ids) | {creator_id}
        for user_id in all_member_ids:
            await self.session.execute(
                chat_members.insert().values(chat_id=chat.id, user_id=user_id)
            )
        
        await self.session.commit()
        await self.session.refresh(chat)
        return chat

    async def get_user_chats(self, user_id: str) -> list[Chat]:
        result = await self.session.execute(
            select(Chat)
            .join(chat_members)
            .where(chat_members.c.user_id == user_id)
            .options(selectinload(Chat.members))
        )
        return list(result.scalars().all())

    async def _broadcast_message(self, message: Message, chat_id: str, session: AsyncSession):
        """Internal helper to publish message to Redis"""
        try:
            from core.redis import get_redis_client
            
            # Get all chat members for targeting
            members_result = await session.execute(
                select(chat_members.c.user_id).where(chat_members.c.chat_id == chat_id)
            )
            target_user_ids = [str(r[0]) for r in members_result.all()]
            
            redis = get_redis_client()
            event = {
                "type": "message.new",
                "target_user_ids": target_user_ids,
                "payload": {
                    "type": "message.new",
                    "data": json.loads(MessageSchema.model_validate(message).model_dump_json())
                }
            }
            await redis.publish("chat_events", json.dumps(event))
        except Exception as e:
            print(f"Failed to broadcast: {e}")

    async def send_message(self, body: MessageCreateSchema, sender_id: str) -> Message:
        membership = await self.session.execute(
            select(chat_members).where(
                and_(
                    chat_members.c.chat_id == body.chat_id,
                    chat_members.c.user_id == sender_id
                )
            )
        )
        if not membership.first():
            raise Exception("User not in chat")

        message = Message(
            content=body.content,
            chat_id=body.chat_id,
            sender_id=sender_id,
            parent_id=body.parent_id
        )
        self.session.add(message)
        await self.session.commit()
        await self.session.refresh(message, ["sender"])

        # Broadcast via Redis
        await self._broadcast_message(message, body.chat_id, self.session)

        # Trigger bot response emulation
        asyncio.create_task(self._handle_bot_response(body.chat_id, sender_id))

        return message

    async def _handle_bot_response(self, chat_id: str, original_sender_id: str):
        """Simulate responses from Tron AI"""
        from core.database import AsyncSessionLocal
        from modules.users.models import User
        
        await asyncio.sleep(2)
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User)
                .join(chat_members)
                .where(
                    and_(
                        chat_members.c.chat_id == chat_id,
                        chat_members.c.user_id != original_sender_id
                    )
                )
            )
            others = result.scalars().all()
            
            for other in others:
                bot_msg = None
                if other.email == "tron@system.com":
                    bot_msg = "Greeting program. System is operational. How can I assist you on the Grid?"
                
                if bot_msg:
                    new_msg = Message(
                        content=bot_msg,
                        chat_id=chat_id,
                        sender_id=other.id
                    )
                    session.add(new_msg)
                    await session.commit()
                    await session.refresh(new_msg, ["sender"])
                    
                    # IMPORTANT: Also broadcast the bot's message!
                    await self._broadcast_message(new_msg, chat_id, session)
                    break

    async def get_chat_messages(self, chat_id: str, user_id: str, limit: int = 50) -> list[Message]:
        membership = await self.session.execute(
            select(chat_members).where(
                and_(
                    chat_members.c.chat_id == chat_id,
                    chat_members.c.user_id == user_id
                )
            )
        )
        if not membership.first():
            raise Exception("User not in chat")

        result = await self.session.execute(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
