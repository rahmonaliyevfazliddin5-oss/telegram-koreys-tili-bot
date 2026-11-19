"""make student grade and last_name nullable

Revision ID: 002_student_nullable
Revises: 001_initial_schema
Create Date: 2026-11-19 22:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002_student_nullable'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('students', 'last_name',
               existing_type=sa.String(length=100),
               nullable=True)
    op.alter_column('students', 'grade',
               existing_type=sa.String(length=50),
               nullable=True)


def downgrade() -> None:
    op.alter_column('students', 'grade',
               existing_type=sa.String(length=50),
               nullable=False)
    op.alter_column('students', 'last_name',
               existing_type=sa.String(length=100),
               nullable=False)
