from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey, Date, SmallInteger, DateTime, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    lesson_no: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)  # 1 | 2
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    student = relationship("Student", back_populates="grades")

    __table_args__ = (
        CheckConstraint("value >= 1 AND value <= 5", name="ck_grades_value"),
        CheckConstraint("lesson_no IN (1, 2)", name="ck_grades_lesson_no"),
        UniqueConstraint("student_id", "date", "lesson_no", name="uq_grades_student_date_lesson_no"),
        Index("ix_grades_student_id", "student_id"),
        Index("ix_grades_date_lesson_no", "date", "lesson_no"),
    )
