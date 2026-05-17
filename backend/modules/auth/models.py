from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.core.models import Base, pk_ulid

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[pk_ulid]
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    def __repr__(self) -> str:
        return f"<RefreshToken {self.token[:10]}... user_id={self.user_id}>"
