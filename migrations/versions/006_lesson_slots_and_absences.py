"""add lesson_slots to students, finalized_at to lessons, and lesson_absences table

Revision ID: 006_lesson_slots_and_absences
Revises: 005_attendance_marks_v3
Create Date: 2026-11-21 10:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '006_lesson_slots_and_absences'
down_revision: Union[str, None] = '005_attendance_marks_v3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. students.lesson_slots
    if 'students' in tables:
        student_columns = [col['name'] for col in inspector.get_columns('students')]
        if 'lesson_slots' not in student_columns:
            op.add_column('students', sa.Column('lesson_slots', sa.SmallInteger(), nullable=True))
            bind = op.get_bind()
            if bind.dialect.name == "postgresql":
                op.create_check_constraint(
                    'ck_students_lesson_slots',
                    'students',
                    "lesson_slots IN (1, 2, 3) OR lesson_slots IS NULL"
                )
            op.create_index('ix_students_lesson_slots', 'students', ['lesson_slots'])

    # 2. lessons.finalized_at
    if 'lessons' in tables:
        lesson_columns = [col['name'] for col in inspector.get_columns('lessons')]
        if 'finalized_at' not in lesson_columns:
            op.add_column('lessons', sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True))

    # 3. lesson_absences table
    if 'lesson_absences' not in tables:
        op.create_table(
            'lesson_absences',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('lesson_id', 'student_id', name='uq_lesson_student_absence')
        )
        op.create_index('ix_lesson_absences_student_id', 'lesson_absences', ['student_id'])
        op.create_index('ix_lesson_absences_lesson_id', 'lesson_absences', ['lesson_id'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'lesson_absences' in tables:
        op.drop_table('lesson_absences')

    if 'lessons' in tables:
        lesson_columns = [col['name'] for col in inspector.get_columns('lessons')]
        if 'finalized_at' in lesson_columns:
            op.drop_column('lessons', 'finalized_at')

    if 'students' in tables:
        student_columns = [col['name'] for col in inspector.get_columns('students')]
        if 'lesson_slots' in student_columns:
            bind = op.get_bind()
            if bind.dialect.name == "postgresql":
                try:
                    op.drop_constraint('ck_students_lesson_slots', 'students', type_='check')
                except Exception:
                    pass
            try:
                op.drop_index('ix_students_lesson_slots', 'students')
            except Exception:
                pass
            op.drop_column('students', 'lesson_slots')
