"""update student Raxmatullayev to Rahmonaliyev

Revision ID: 010_update_student_rahmonaliyev
Revises: 009_clear_grades_keep_students
Create Date: 2026-11-24 12:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '010_update_student_rahmonaliyev'
down_revision: Union[str, None] = '009_clear_grades_keep_students'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "students" in tables:
        conn.execute(
            sa.text(
                "UPDATE students SET last_name = 'Rahmonaliyev' "
                "WHERE last_name = 'Raxmatullayev' AND first_name = 'Fazliddin'"
            )
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = set(inspector.get_table_names())

    if "students" in tables:
        conn.execute(
            sa.text(
                "UPDATE students SET last_name = 'Raxmatullayev' "
                "WHERE last_name = 'Rahmonaliyev' AND first_name = 'Fazliddin'"
            )
        )
