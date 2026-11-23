from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import Date, SmallInteger, Text, DateTime, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    lesson_no: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1 | 2
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    homework: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    absences = relationship("LessonAbsence", back_populates="lesson", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("date", "lesson_no", name="uq_lessons_date_lesson_no"),
        CheckConstraint("lesson_no IN (1, 2)", name="ck_lessons_lesson_no"),
        Index("ix_lessons_date", "date"),
    )
