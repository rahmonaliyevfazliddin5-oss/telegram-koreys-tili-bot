"""v2 features: attendance_sessions, absences, grades lessons, fine_ledger, admin_settings

Revision ID: 003_v2_features
Revises: 002_student_nullable
Create Date: 2026-11-20 09:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '003_v2_features'
down_revision: Union[str, None] = '002_student_nullable'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. attendance_sessions jadvali
    op.create_table(
        'attendance_sessions',
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('lesson', sa.SmallInteger(), nullable=False),
        sa.Column('saved_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('lesson IN (1, 2)', name='ck_attendance_sessions_lesson'),
        sa.PrimaryKeyConstraint('date', 'lesson')
    )

    # 2. absences jadvali
    op.create_table(
        'absences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('lesson', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('lesson IN (1, 2)', name='ck_absences_lesson'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'date', 'lesson', name='uq_absences_student_date_lesson')
    )
    op.create_index('ix_absences_student_id', 'absences', ['student_id'])
    op.create_index('ix_absences_date_lesson', 'absences', ['date', 'lesson'])

    # 3. Eski attendance jadvalidagi kelmaganlarni ko'chirish va jadvalni o'chirish (agar mavjud bo'lsa)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'attendance' in tables:
        op.execute("""
            INSERT INTO absences (student_id, date, lesson, created_at)
            SELECT student_id, date, 1, CURRENT_TIMESTAMP
            FROM attendance
            WHERE status = 'absent'
        """)
        op.drop_table('attendance')

    # 4. grades jadvaliga lesson va kind ustunlarini qo'shish
    op.add_column('grades', sa.Column('lesson', sa.SmallInteger(), nullable=False, server_default='1'))
    op.add_column('grades', sa.Column('kind', sa.String(length=20), nullable=False, server_default='daily'))
    op.create_check_constraint('ck_grades_lesson_range', 'grades', 'lesson IN (1, 2)')
    op.create_check_constraint('ck_grades_kind_range', 'grades', "kind IN ('daily', 'exam')")
    op.create_unique_constraint('uq_grades_student_date_lesson_kind', 'grades', ['student_id', 'date', 'lesson', 'kind'])
    op.create_index('ix_grades_date_lesson_kind', 'grades', ['date', 'lesson', 'kind'])

    # 5. fine_ledger jadvali
    op.create_table(
        'fine_ledger',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('amount > 0', name='ck_fine_amount_positive'),
        sa.CheckConstraint("type IN ('fine', 'payment')", name='ck_fine_type_valid'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fine_ledger_student_id', 'fine_ledger', ['student_id'])

    # 6. admin_settings jadvali
    op.create_table(
        'admin_settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('admin_settings')
    op.drop_table('fine_ledger')
    op.drop_index('ix_grades_date_lesson_kind', table_name='grades')
    op.drop_constraint('uq_grades_student_date_lesson_kind', 'grades', type_='unique')
    op.drop_constraint('ck_grades_kind_range', 'grades', type_='check')
    op.drop_constraint('ck_grades_lesson_range', 'grades', type_='check')
    op.drop_column('grades', 'kind')
    op.drop_column('grades', 'lesson')
    op.drop_table('absences')
    op.drop_table('attendance_sessions')
