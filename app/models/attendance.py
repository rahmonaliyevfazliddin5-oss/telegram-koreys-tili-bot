from datetime import date
from sqlalchemy import ForeignKey, Date, String, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)  # "present" | "absent"

    student = relationship("Student", back_populates="attendances")

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
        Index("ix_attendance_date", "date"),
        Index("ix_attendance_student_id", "student_id"),
    )
