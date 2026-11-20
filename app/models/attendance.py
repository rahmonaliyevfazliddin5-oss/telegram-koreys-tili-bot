from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import ForeignKey, Date, SmallInteger, Integer, String, DateTime, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    lesson_no: Mapped[int] = mapped_column(SmallInteger, primary_key=True)  # 1 | 2
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        CheckConstraint("lesson_no IN (1, 2)", name="ck_attendance_sessions_lesson_no"),
    )


class AttendanceMark(Base):
    __tablename__ = "attendance_marks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    lesson_no: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1 | 2
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'present' | 'late'
    late_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)  # 1..600 if late
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    student = relationship("Student", back_populates="attendance_marks")

    __table_args__ = (
        CheckConstraint("status IN ('present', 'late')", name="ck_attendance_marks_status"),
        CheckConstraint("lesson_no IN (1, 2)", name="ck_attendance_marks_lesson_no"),
        CheckConstraint(
            "(status = 'late' AND late_minutes >= 1 AND late_minutes <= 600) OR (status = 'present' AND late_minutes IS NULL)",
            name="ck_attendance_marks_late_minutes"
        ),
        UniqueConstraint("student_id", "date", "lesson_no", name="uq_attendance_marks_student_date_lesson_no"),
        Index("ix_attendance_marks_student_id", "student_id"),
        Index("ix_attendance_marks_date_lesson_no", "date", "lesson_no"),
    )


# Backward-compatible alias for existing queries
Absence = AttendanceMark

