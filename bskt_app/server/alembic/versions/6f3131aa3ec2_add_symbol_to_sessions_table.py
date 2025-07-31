"""Add symbol to sessions table

Revision ID: 6f3131aa3ec2
Revises: 78e95c59906b
Create Date: 2025-07-29 13:38:22.519510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f3131aa3ec2'
down_revision: Union[str, Sequence[str], None] = '78e95c59906b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema by adding the symbol column in three safe steps
    to handle existing data.
    """
    # Step 1: Add the new 'symbol' column, but allow it to be NULL temporarily.
    op.add_column('sessions', sa.Column('symbol', sa.String(), nullable=True))

    # Step 2: Update all existing rows to have a default symbol.
    # We use 'EUR/USD' as a safe default for any sessions created before this change.
    op.execute("UPDATE sessions SET symbol = 'EUR/USD' WHERE symbol IS NULL")

    # Step 3: Now that all rows have a value, alter the column to be NOT NULL.
    op.alter_column('sessions', 'symbol', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # To reverse the process, we just drop the column.
    op.drop_column('sessions', 'symbol')

