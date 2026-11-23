"""clear test grades and lessons, keep students

Revision ID: 009_clear_grades_keep_students
Revises: 008_parent_phone_and_seed_students
Create Date: 2026-11-24 00:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '009_clear_grades_keep_students'
down_revision: Union[str, None] = '008_parent_phone_and_seed_students'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    tables_to_clear = [
        "exam_grades",
        "grades",
        "attendance_marks",
        "lesson_absences",
        "fine_ledger",
        "exams",
        "lessons"
    ]
    for tbl in tables_to_clear:
        if tbl in tables:
            conn.execute(sa.text(f"DELETE FROM {tbl}"))


def downgrade() -> None:
    pass
