from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey, Date, SmallInteger, DateTime, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    lesson: Mapped[int] = mapped_column(SmallInteger, primary_key=True)  # 1 | 2
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        CheckConstraint("lesson IN (1, 2)", name="ck_attendance_sessions_lesson"),
    )


class Absence(Base):
    __tablename__ = "absences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    lesson: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1 | 2
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    student = relationship("Student", back_populates="absences")

    __table_args__ = (
        CheckConstraint("lesson IN (1, 2)", name="ck_absences_lesson"),
        UniqueConstraint("student_id", "date", "lesson", name="uq_absences_student_date_lesson"),
        Index("ix_absences_student_id", "student_id"),
        Index("ix_absences_date_lesson", "date", "lesson"),
    )
