from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="")
    grade: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    attendance_marks = relationship("AttendanceMark", back_populates="student", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="student", cascade="all, delete-orphan")
    exam_grades = relationship("ExamGrade", back_populates="student", cascade="all, delete-orphan")
    fine_entries = relationship("FineLedger", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_students_name", "last_name", "first_name"),
    )
