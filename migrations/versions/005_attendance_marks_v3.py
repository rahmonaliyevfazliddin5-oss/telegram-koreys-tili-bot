"""update attendance_marks check constraint to present and late

Revision ID: 005_attendance_marks_v3
Revises: 004_lessons_exams_attendance
Create Date: 2026-11-20 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '005_attendance_marks_v3'
down_revision: Union[str, None] = '004_lessons_exams_attendance'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'attendance_marks' in tables:
        # 1. Eski 'absent' yozuvlarini o'chirish (zaxiradan keyin)
        op.execute("DELETE FROM attendance_marks WHERE status = 'absent'")

        # 2. Dialect tekshiruvi (PostgreSQL bo'lsa constraint drop/add, aks holda batch)
        bind = op.get_bind()
        if bind.dialect.name == "postgresql":
            try:
                op.drop_constraint('ck_attendance_marks_status', 'attendance_marks', type_='check')
            except Exception:
                pass
            try:
                op.drop_constraint('ck_attendance_marks_late_minutes', 'attendance_marks', type_='check')
            except Exception:
                pass

            op.create_check_constraint(
                'ck_attendance_marks_status',
                'attendance_marks',
                "status IN ('present', 'late')"
            )
            op.create_check_constraint(
                'ck_attendance_marks_late_minutes',
                'attendance_marks',
                "(status = 'late' AND late_minutes >= 1 AND late_minutes <= 600) OR (status = 'present' AND late_minutes IS NULL)"
            )
        else:
            # SQLite batch mode
            with op.batch_alter_table('attendance_marks') as batch_op:
                batch_op.create_check_constraint(
                    'ck_attendance_marks_status',
                    "status IN ('present', 'late')"
                )
                batch_op.create_check_constraint(
                    'ck_attendance_marks_late_minutes',
                    "(status = 'late' AND late_minutes >= 1 AND late_minutes <= 600) OR (status = 'present' AND late_minutes IS NULL)"
                )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        try:
            op.drop_constraint('ck_attendance_marks_status', 'attendance_marks', type_='check')
            op.drop_constraint('ck_attendance_marks_late_minutes', 'attendance_marks', type_='check')
        except Exception:
            pass
        op.create_check_constraint(
            'ck_attendance_marks_status',
            'attendance_marks',
            "status IN ('absent', 'late')"
        )
        op.create_check_constraint(
            'ck_attendance_marks_late_minutes',
            'attendance_marks',
            "(status = 'late' AND late_minutes >= 1 AND late_minutes <= 600) OR (status = 'absent' AND late_minutes IS NULL)"
        )
