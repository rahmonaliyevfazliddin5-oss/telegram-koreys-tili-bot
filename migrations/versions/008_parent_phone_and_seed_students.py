"""add parent_phone and homework and seed 46 students

Revision ID: 008_parent_phone_and_seed_students
Revises: 007_clear_students_and_grades
Create Date: 2026-11-23 22:45:00.000000

"""
from typing import Sequence, Union
import json
import os
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa


revision: str = '008_parent_phone_and_seed_students'
down_revision: Union[str, None] = '007_clear_students_and_grades'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "students" in tables:
        cols_students = {c["name"] for c in inspector.get_columns("students")}
        if "parent_phone" not in cols_students:
            op.add_column("students", sa.Column("parent_phone", sa.String(50), nullable=True))

    if "lessons" in tables:
        cols_lessons = {c["name"] for c in inspector.get_columns("lessons")}
        if "homework" not in cols_lessons:
            op.add_column("lessons", sa.Column("homework", sa.Text(), nullable=True))

    # Populate 46 students if students table is empty
    if "students" in tables:
        count_res = conn.execute(sa.text("SELECT COUNT(*) FROM students"))
        cnt = count_res.scalar() or 0
        if cnt == 0:
            seed_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data",
                "students_seed.json"
            )
            if os.path.exists(seed_path):
                with open(seed_path, "r", encoding="utf-8") as f:
                    items = json.load(f)
                now = datetime.now(timezone.utc)
                for it in items:
                    conn.execute(
                        sa.text(
                            "INSERT INTO students (first_name, last_name, grade, parent_phone, lesson_slots, created_at) "
                            "VALUES (:fn, :ln, :gr, :ph, NULL, :ca)"
                        ),
                        {
                            "fn": it.get("first_name", ""),
                            "ln": it.get("last_name", ""),
                            "gr": it.get("grade"),
                            "ph": it.get("parent_phone"),
                            "ca": now
                        }
                    )


def downgrade() -> None:
    pass
