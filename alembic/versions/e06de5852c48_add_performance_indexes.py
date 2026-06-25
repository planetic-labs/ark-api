"""add_performance_indexes

Revision ID: e06de5852c48
Revises: bb9d845746f2
Create Date: 2026-06-25 10:32:01.432379

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e06de5852c48"
down_revision: str | Sequence[str] | None = "bb9d845746f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_messages_chat_created
            ON messages (chat_id, created_at DESC);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_messages_thread
            ON messages (parent_id, created_at ASC) WHERE parent_id IS NOT NULL;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_default
            ON roles (is_default) WHERE is_default = TRUE;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_messages_chat_created;")
    op.execute("DROP INDEX IF EXISTS idx_messages_thread;")
    op.execute("DROP INDEX IF EXISTS idx_roles_default;")
