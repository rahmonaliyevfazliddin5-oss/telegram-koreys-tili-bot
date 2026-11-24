"""add eight new students and update Soyibjanova

Revision ID: 011_add_eight_students
Revises: 010_update_student_rahmonaliyev
Create Date: 2026-11-24 18:50:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa


revision: str = '011_add_eight_students'
down_revision: Union[str, None] = '010_update_student_rahmonaliyev'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "students" in tables:
        # 1. Soibjonova -> Soyibjanova
        conn.execute(
            sa.text(
                "UPDATE students SET last_name = 'Soyibjanova' "
                "WHERE last_name = 'Soibjonova' AND first_name = 'Ruqiyaxon'"
            )
        )
        # 2. Yangi o'quvchilar
        new_students = [
            ("Bunyodbek", "Rustamov", "8"),
            ("Asadbek", "Isaqov", None),
            ("Ruqiyaxon", "Soyibjanova", "9"),
            ("Biloliddin", "Axmadov", "9"),
            ("Abdulaziz", "Abduganiyev", "10"),
            ("Nurillo", "Toshtemirov", "10"),
            ("Elbek", "Gʻofurov", "10"),
            ("Abdushukur", "Toshpoʻlatov", "9"),
        ]
        now = datetime.now(timezone.utc)
        for fn, ln, gr in new_students:
            exists = conn.execute(
                sa.text("SELECT 1 FROM students WHERE first_name = :fn AND last_name = :ln"),
                {"fn": fn, "ln": ln}
            ).first()
            if not exists:
                conn.execute(
                    sa.text(
                        "INSERT INTO students (first_name, last_name, grade, parent_phone, lesson_slots, created_at) "
                        "VALUES (:fn, :ln, :gr, NULL, NULL, :ca)"
                    ),
                    {"fn": fn, "ln": ln, "gr": gr, "ca": now}
                )


def downgrade() -> None:
    pass
