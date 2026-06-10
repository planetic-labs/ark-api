from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, pk_ulid

if TYPE_CHECKING:
    from modules.users.models import User


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id: Mapped[pk_ulid]
    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="device_tokens")
