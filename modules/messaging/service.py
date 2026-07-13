import asyncio
import json

from sqlalchemy import and_, func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.messaging.exceptions import ChatAccessDeniedError
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
            stmt = (
                select(Chat)
                .join(chat_members)
                .where(
                    and_(
                        Chat.is_group.is_(False),
                        chat_members.c.user_id.in_([creator_id, other_id]),
                    )
                )
                .group_by(Chat.id)
                .having(func.count(Chat.id) == 2)
            )

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
        # 1. Fetch all group chats
        group_chats_result = await self.session.execute(
            select(Chat).where(Chat.is_group.is_(True))
        )
        group_chats = group_chats_result.scalars().all()

        # 2. Fetch chats the user is already a member of
        member_chats_result = await self.session.execute(
            select(chat_members.c.chat_id).where(chat_members.c.user_id == user_id)
        )
        member_chat_ids = {r[0] for r in member_chats_result.all()}

        # 3. Add user to any missing group chats
        added_any = False
        for gc in group_chats:
            if gc.id not in member_chat_ids:
                await self.session.execute(
                    chat_members.insert().values(chat_id=gc.id, user_id=user_id)
                )
                added_any = True

        if added_any:
            await self.session.commit()

        # 4. Fetch chat IDs with their last active time (most recent first)
        stmt = (
            select(
                Chat.id,
                func.coalesce(func.max(Message.created_at), Chat.created_at).label("last_active")
            )
            .join(chat_members, Chat.id == chat_members.c.chat_id)
            .outerjoin(Message, Chat.id == Message.chat_id)
            .where(chat_members.c.user_id == user_id)
            .group_by(Chat.id, Chat.created_at)
            .order_by(desc("last_active"))
        )
        ordered_ids_result = await self.session.execute(stmt)
        ordered_ids = [row[0] for row in ordered_ids_result.all()]

        if not ordered_ids:
            return []

        # Fetch the Chat objects with selectinload(Chat.members)
        result = await self.session.execute(
            select(Chat)
            .where(Chat.id.in_(ordered_ids))
            .options(selectinload(Chat.members))
        )
        chats_dict = {c.id: c for c in result.scalars().all()}
        chats = [chats_dict[cid] for cid in ordered_ids if cid in chats_dict]

        # Fetch the latest message for each chat to populate last_message
        last_messages = {}
        subq = (
            select(Message.chat_id, func.max(Message.created_at).label("max_date"))
            .where(Message.chat_id.in_(ordered_ids))
            .group_by(Message.chat_id)
            .subquery()
        )
        stmt_msgs = (
            select(Message)
            .join(subq, and_(Message.chat_id == subq.c.chat_id, Message.created_at == subq.c.max_date))
            .options(selectinload(Message.sender))
        )
        msgs_result = await self.session.execute(stmt_msgs)
        for m in msgs_result.scalars().all():
            last_messages[m.chat_id] = m

        for chat in chats:
            chat.last_message = last_messages.get(chat.id)

        return chats

    async def _broadcast_message(
        self, message: Message, chat_id: str, session: AsyncSession
    ):
        """Publish message to Redis and enqueue pushes for offline users"""
        try:
            from core.redis import get_redis_client

            # Get all chat members for targeting
            members_result = await session.execute(
                select(chat_members.c.user_id).where(chat_members.c.chat_id == chat_id)
            )
            target_user_ids = [str(r[0]) for r in members_result.all()]

            async with get_redis_client() as client:
                event = {
                    "type": "message.new",
                    "target_user_ids": target_user_ids,
                    "payload": {
                        "type": "message.new",
                        "data": json.loads(
                            MessageSchema.model_validate(message).model_dump_json()
                        ),
                    },
                }
                await client.publish("chat_events", json.dumps(event))

                # 1. Determine offline target users (exclude sender)
                offline_user_ids = []
                sender_id_str = str(message.sender_id) if message.sender_id else None
                for uid in target_user_ids:
                    if uid == sender_id_str:
                        continue
                    is_online = await client.exists(f"user:online:{uid}")
                    if not is_online:
                        offline_user_ids.append(uid)

            if offline_user_ids:
                # 2. Determine channel and sound
                sound = "default"
                channel_id = "default"

                content_lower = (message.content or "").lower()
                is_satsang_trigger = any(
                    word in content_lower
                    for word in ["встреча", "сатсанг", "satsang", "начало встречи"]
                )

                sender_role = message.sender.role if message.sender else None

                if is_satsang_trigger:
                    sound = "siren_satsang.wav"
                    channel_id = "siren_satsang"
                elif sender_role == "WARRIOR":
                    sound = "siren_warrior.wav"
                    channel_id = "siren_warrior"

                # 3. Enqueue the task
                from core.redis import enqueue_push_notification

                await enqueue_push_notification(
                    user_ids=offline_user_ids,
                    title=message.sender.full_name or "Новое сообщение",
                    body=message.content or "Вам отправлено сообщение",
                    sound=sound,
                    channel_id=channel_id,
                    data={"chat_id": chat_id, "message_id": message.id},
                )
        except Exception as e:
            print(f"Failed to broadcast: {e}")

    async def send_message(self, body: MessageCreateSchema, sender_id: str) -> Message:
        membership = await self.session.execute(
            select(chat_members).where(
                and_(
                    chat_members.c.chat_id == body.chat_id,
                    chat_members.c.user_id == sender_id,
                )
            )
        )
        if not membership.first():
            raise ChatAccessDeniedError()

        message = Message(
            content=body.content,
            chat_id=body.chat_id,
            sender_id=sender_id,
            parent_id=body.parent_id,
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
                        chat_members.c.user_id != original_sender_id,
                    )
                )
            )
            others = result.scalars().all()

            for other in others:
                bot_msg = None
                if other.email == "tron@system.com":
                    bot_msg = (
                        "Greeting program. System is operational. "
                        "How can I assist you on the Grid?"
                    )

                if bot_msg:
                    new_msg = Message(
                        content=bot_msg, chat_id=chat_id, sender_id=other.id
                    )
                    session.add(new_msg)
                    await session.commit()
                    await session.refresh(new_msg, ["sender"])

                    # IMPORTANT: Also broadcast the bot's message!
                    await self._broadcast_message(new_msg, chat_id, session)
                    break

    async def get_chat_messages(
        self, chat_id: str, user_id: str, limit: int = 50
    ) -> list[Message]:
        membership = await self.session.execute(
            select(chat_members).where(
                and_(
                    chat_members.c.chat_id == chat_id, chat_members.c.user_id == user_id
                )
            )
        )
        if not membership.first():
            raise ChatAccessDeniedError()

        result = await self.session.execute(
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()
        return messages
