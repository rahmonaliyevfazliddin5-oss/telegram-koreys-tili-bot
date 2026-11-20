from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import ForeignKey, Date, SmallInteger, String, Text, DateTime, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    lesson_no: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1 | 2
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    exam_grades = relationship("ExamGrade", back_populates="exam", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("lesson_no IN (1, 2)", name="ck_exams_lesson_no"),
        Index("ix_exams_date", "date"),
    )


class ExamGrade(Base):
    __tablename__ = "exam_grades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    modifier: Mapped[Optional[str]] = mapped_column(String(5), nullable=True, default=None)  # 'plus' | 'minus' | None
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    exam = relationship("Exam", back_populates="exam_grades")
    student = relationship("Student", back_populates="exam_grades")

    __table_args__ = (
        CheckConstraint("value >= 1 AND value <= 5", name="ck_exam_grades_value"),
        CheckConstraint("(modifier IN ('plus', 'minus')) OR (modifier IS NULL)", name="ck_exam_grades_modifier"),
        UniqueConstraint("exam_id", "student_id", name="uq_exam_grades_exam_student"),
        Index("ix_exam_grades_student_id", "student_id"),
        Index("ix_exam_grades_exam_id", "exam_id"),
    )
