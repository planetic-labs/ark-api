from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, pk_ulid

# Association table for group chat members
chat_members = Table(
    "chat_members",
    Base.metadata,
    Column(
        "chat_id",
        String(26),
        ForeignKey("chats.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("joined_at", DateTime(timezone=True), server_default=func.now()),
)


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[pk_ulid]
    name: Mapped[str | None] = mapped_column(String(255))  # None for DMs
    is_group: Mapped[bool] = mapped_column(default=False)

    # Relationships
    members: Mapped[list[User]] = relationship(
        secondary=chat_members, back_populates="chats"
    )
    messages: Mapped[list[Message]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[pk_ulid]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, server_default=func.now()
    )
    content: Mapped[str] = mapped_column(String(4000))
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    chat_id: Mapped[str] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))

    # For threads (logical key, no physical FK constraint in DB migrations because of table partitioning)
    parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE")
    )

    # Relationships
    chat: Mapped[Chat] = relationship(back_populates="messages")
    sender: Mapped[User] = relationship()
    replies: Mapped[list[Message]] = relationship(
        back_populates="parent",
    )
    parent: Mapped[Message | None] = relationship(
        back_populates="replies",
        remote_side="Message.id",  # Use string to avoid built-in id() conflict
    )

    def __repr__(self) -> str:
        return f"<Message {self.id[:8]} from {self.sender_id}>"
