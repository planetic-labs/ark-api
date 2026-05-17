from enum import Enum
from sqlalchemy import String, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.models import Base, pk_ulid

class UserRole(str, Enum):
    MASTER = "MASTER"
    WARRIOR = "WARRIOR"
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id: Mapped[pk_ulid]
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), 
        default=UserRole.STUDENT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # User profile info
    full_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(512))

    # Relationships
    from backend.modules.messaging.models import chat_members
    chats: Mapped[list["Chat"]] = relationship(
        secondary=chat_members,
        back_populates="members"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
