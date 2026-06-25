from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modules.messaging.models import Chat
    from modules.notifications.models import DeviceToken

import sqlalchemy as sa
from sqlalchemy import ARRAY, Boolean, Column, DateTime, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models import Base, pk_ulid

# Association table for User <-> Role (Many-to-Many)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column(
        "user_id",
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "role_id",
        String(26),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# Association table for Role <-> Permission (Many-to-Many)
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        String(26),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        String(26),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# Association table for User <-> Personal Permission (Many-to-Many)
user_permissions = Table(
    "user_permissions",
    Base.metadata,
    Column(
        "user_id",
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        String(26),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[pk_ulid]
    key: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)

    def __repr__(self) -> str:
        return f"<Permission {self.key}>"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[pk_ulid]
    name: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    permissions: Mapped[list[Permission]] = relationship(
        secondary=role_permissions, lazy="selectin"
    )
    users: Mapped[list[User]] = relationship(
        secondary=user_roles, back_populates="roles"
    )

    def __repr__(self) -> str:
        return f"<Role {self.name} system={self.is_system} default={self.is_default}>"


class User(Base):
    __tablename__ = "users"

    id: Mapped[pk_ulid]
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)

    # Updated fields matching GEMINI.md
    first_name: Mapped[str] = mapped_column(String(255), default="")
    last_name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="created")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    @property
    def full_name(self) -> str:
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or ""

    @full_name.setter
    def full_name(self, value: str):
        if not value:
            self.first_name = ""
            self.last_name = ""
            return
        parts = value.strip().split(maxsplit=1)
        if len(parts) == 2:
            self.first_name, self.last_name = parts
        else:
            self.first_name = parts[0]
            self.last_name = ""

    @property
    def name(self) -> str:
        return self.full_name

    @name.setter
    def name(self, value: str):
        self.full_name = value

    @property
    def is_admin(self) -> bool:
        return any(role.name == "admin" for role in self.roles)

    @property
    def role(self) -> str:
        if not self.roles:
            return "STUDENT"
        role_names_lower = [role.name.lower() for role in self.roles]
        if "admin" in role_names_lower:
            return "ADMIN"
        if "master" in role_names_lower:
            return "MASTER"
        if "warrior" in role_names_lower:
            return "WARRIOR"
        return self.roles[0].name.upper()

    # Relationships
    roles: Mapped[list[Role]] = relationship(
        secondary=user_roles, back_populates="users", lazy="selectin"
    )
    personal_permissions: Mapped[list[Permission]] = relationship(
        secondary=user_permissions, lazy="selectin"
    )

    from modules.messaging.models import chat_members

    chats: Mapped[list[Chat]] = relationship(
        secondary=chat_members, back_populates="members"
    )

    device_tokens: Mapped[list[DeviceToken]] = relationship(  # type: ignore
        "DeviceToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User {self.email} status={self.status}>"


class ServiceClient(Base):
    __tablename__ = "service_clients"

    id: Mapped[pk_ulid]
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    allowed_origins: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=sa.text("now()"),
        default=lambda: datetime.now(UTC),
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def __repr__(self) -> str:
        return f"<ServiceClient {self.name} active={self.is_active}>"
