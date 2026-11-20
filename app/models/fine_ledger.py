from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, BigInteger, DateTime, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class FineLedger(Base):
    __tablename__ = "fine_ledger"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # "fine" | "payment"
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    student = relationship("Student", back_populates="fine_entries")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_fine_amount_positive"),
        CheckConstraint("type IN ('fine', 'payment')", name="ck_fine_type_valid"),
        Index("ix_fine_ledger_student_id", "student_id"),
    )
