"""lessons, exams, exam_grades, attendance_marks

Revision ID: 004_lessons_exams_attendance
Revises: 003_v2_features
Create Date: 2026-11-20 10:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '004_lessons_exams_attendance'
down_revision: Union[str, None] = '003_v2_features'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. lessons jadvali
    if 'lessons' not in tables:
        op.create_table(
            'lessons',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('lesson_no', sa.SmallInteger(), nullable=False),
            sa.Column('topic', sa.Text(), nullable=False),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint('lesson_no IN (1, 2)', name='ck_lessons_lesson_no'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('date', 'lesson_no', name='uq_lessons_date_lesson_no')
        )
        op.create_index('ix_lessons_date', 'lessons', ['date'])

    # 2. exams jadvali
    if 'exams' not in tables:
        op.create_table(
            'exams',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('lesson_no', sa.SmallInteger(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('topic', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint('lesson_no IN (1, 2)', name='ck_exams_lesson_no'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_exams_date', 'exams', ['date'])

    # 3. exam_grades jadvali
    if 'exam_grades' not in tables:
        op.create_table(
            'exam_grades',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('exam_id', sa.Integer(), nullable=False),
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('value', sa.SmallInteger(), nullable=False),
            sa.Column('modifier', sa.String(length=5), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint('value >= 1 AND value <= 5', name='ck_exam_grades_value'),
            sa.CheckConstraint("(modifier IN ('plus', 'minus')) OR (modifier IS NULL)", name='ck_exam_grades_modifier'),
            sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('exam_id', 'student_id', name='uq_exam_grades_exam_student')
        )
        op.create_index('ix_exam_grades_student_id', 'exam_grades', ['student_id'])
        op.create_index('ix_exam_grades_exam_id', 'exam_grades', ['exam_id'])

    # 4. attendance_marks jadvali
    if 'attendance_marks' not in tables:
        op.create_table(
            'attendance_marks',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('lesson_no', sa.SmallInteger(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False),
            sa.Column('late_minutes', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("status IN ('absent', 'late')", name='ck_attendance_marks_status'),
            sa.CheckConstraint('lesson_no IN (1, 2)', name='ck_attendance_marks_lesson_no'),
            sa.CheckConstraint(
                "(status = 'late' AND late_minutes >= 1 AND late_minutes <= 600) OR (status = 'absent' AND late_minutes IS NULL)",
                name='ck_attendance_marks_late_minutes'
            ),
            sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('student_id', 'date', 'lesson_no', name='uq_attendance_marks_student_date_lesson_no')
        )
        op.create_index('ix_attendance_marks_student_id', 'attendance_marks', ['student_id'])
        op.create_index('ix_attendance_marks_date_lesson_no', 'attendance_marks', ['date', 'lesson_no'])

    # 5. Eski absences jadvalidan ma'lumotlarni ko'chirish
    if 'absences' in tables:
        op.execute("""
            INSERT INTO attendance_marks (student_id, date, lesson_no, status, late_minutes, created_at)
            SELECT student_id, date, lesson, 'absent', NULL, created_at
            FROM absences
            ON CONFLICT (student_id, date, lesson_no) DO NOTHING
        """)
        op.drop_table('absences')

    # 6. attendance_sessions ustunini moslashtirish (agar lesson deb atalgan bo'lsa)
    if 'attendance_sessions' in tables:
        cols = [c['name'] for c in inspector.get_columns('attendance_sessions')]
        if 'lesson' in cols and 'lesson_no' not in cols:
            op.alter_column('attendance_sessions', 'lesson', new_column_name='lesson_no')

    # 7. grades jadvalini dars baholariga moslash (kind ustunini olib tashlash)
    if 'grades' in tables:
        cols = [c['name'] for c in inspector.get_columns('grades')]
        if 'lesson' in cols and 'lesson_no' not in cols:
            op.alter_column('grades', 'lesson', new_column_name='lesson_no')
        
        # Eski unique constraint va indexlarni tozalash
        try:
            op.drop_constraint('uq_grades_student_date_lesson_kind', 'grades', type_='unique')
        except Exception:
            pass
        try:
            op.drop_index('ix_grades_date_lesson_kind', table_name='grades')
        except Exception:
            pass
        try:
            op.drop_column('grades', 'kind')
        except Exception:
            pass

        # Yangi unique constraint va index
        try:
            op.create_unique_constraint('uq_grades_student_date_lesson_no', 'grades', ['student_id', 'date', 'lesson_no'])
        except Exception:
            pass
        try:
            op.create_index('ix_grades_date_lesson_no', 'grades', ['date', 'lesson_no'])
        except Exception:
            pass


def downgrade() -> None:
    op.drop_table('attendance_marks')
    op.drop_table('exam_grades')
    op.drop_table('exams')
    op.drop_table('lessons')
