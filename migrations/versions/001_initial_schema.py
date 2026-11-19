"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. bot_users jadvali
    op.create_table(
        'bot_users',
        sa.Column('telegram_id', sa.BigInteger(), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='uz'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('telegram_id')
    )

    # 2. students jadvali
    op.create_table(
        'students',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('grade', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_students_name', 'students', ['last_name', 'first_name'], unique=False)

    # 3. attendance jadvali
    op.create_table(
        'attendance',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'date', name='uq_attendance_student_date')
    )
    op.create_index('ix_attendance_date', 'attendance', ['date'], unique=False)
    op.create_index('ix_attendance_student_id', 'attendance', ['student_id'], unique=False)

    # 4. grades jadvali
    op.create_table(
        'grades',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('value', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint('value >= 1 AND value <= 5', name='ck_grades_value_range'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_grades_student_id', 'grades', ['student_id'], unique=False)
    op.create_index('ix_grades_date', 'grades', ['date'], unique=False)

    # 5. sources jadvali
    op.create_table(
        'sources',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title_uz', sa.String(length=255), nullable=False),
        sa.Column('title_en', sa.String(length=255), nullable=False),
        sa.Column('title_ru', sa.String(length=255), nullable=False),
        sa.Column('text_uz', sa.Text(), nullable=False),
        sa.Column('text_en', sa.Text(), nullable=False),
        sa.Column('text_ru', sa.Text(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('sources')
    op.drop_index('ix_grades_date', table_name='grades')
    op.drop_index('ix_grades_student_id', table_name='grades')
    op.drop_table('grades')
    op.drop_index('ix_attendance_student_id', table_name='attendance')
    op.drop_index('ix_attendance_date', table_name='attendance')
    op.drop_table('attendance')
    op.drop_index('ix_students_name', table_name='students')
    op.drop_table('students')
    op.drop_table('bot_users')
