"""clear students, grades, attendance, exams and lessons data

Revision ID: 007_clear_students_and_grades
Revises: 006_lesson_slots_and_absences
Create Date: 2026-11-23 08:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '007_clear_students_and_grades'
down_revision: Union[str, None] = '006_lesson_slots_and_absences'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    order = [
        "exam_grades",
        "grades",
        "attendance_marks",
        "lesson_absences",
        "absences",
        "attendance_sessions",
        "fine_ledger",
        "exams",
        "lessons",
        "students"
    ]
    for table_name in order:
        if table_name in tables:
            conn.execute(sa.text(f"DELETE FROM {table_name}"))


def downgrade() -> None:
    pass
