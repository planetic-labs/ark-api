"""split_user_name_to_first_last

Revision ID: 57431b195857
Revises: 6a6908e87629
Create Date: 2026-06-03 02:29:15.774679

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '57431b195857'
down_revision: str | Sequence[str] | None = '6a6908e87629'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add first_name and last_name columns with a default value
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=False, server_default=''))
    
    # Migrate existing data from 'name' to first_name and last_name
    op.execute("UPDATE users SET first_name = split_part(name, ' ', 1), last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1) WHERE POSITION(' ' IN name) > 0")
    op.execute("UPDATE users SET first_name = name, last_name = '' WHERE POSITION(' ' IN name) = 0")
    
    # Drop the original name column
    op.drop_column('users', 'name')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the name column
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=False, server_default=''))
    
    # Combine first_name and last_name to recreate full name
    op.execute("UPDATE users SET name = TRIM(first_name || ' ' || last_name)")
    
    # Drop first_name and last_name columns
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
