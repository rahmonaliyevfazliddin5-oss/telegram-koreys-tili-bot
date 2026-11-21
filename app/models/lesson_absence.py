from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class LessonAbsence(Base):
    __tablename__ = "lesson_absences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    lesson = relationship("Lesson", back_populates="absences")
    student = relationship("Student", back_populates="absences")

    __table_args__ = (
        UniqueConstraint("lesson_id", "student_id", name="uq_lesson_student_absence"),
        Index("ix_lesson_absences_student_id", "student_id"),
        Index("ix_lesson_absences_lesson_id", "lesson_id"),
    )
