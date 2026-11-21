from datetime import date, datetime
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam


async def get_exams_by_date(db: AsyncSession, target_date: date) -> List[Exam]:
    """Muayyan sana bo'yicha imtihonlarni olish."""
    stmt = select(Exam).where(Exam.date == target_date).order_by(Exam.lesson_no, Exam.id)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_exam_by_id(db: AsyncSession, exam_id: int) -> Optional[Exam]:
    """ID bo'yicha bitta imtihonni olish."""
    stmt = select(Exam).where(Exam.id == exam_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def create_exam(
    db: AsyncSession,
    target_date: date,
    lesson_no: int,
    name: str,
    topic: str,
    created_at: datetime
) -> Exam:
    """Yangi imtihon yaratish."""
    exam = Exam(
        date=target_date,
        lesson_no=lesson_no,
        name=name.strip(),
        topic=topic.strip(),
        created_at=created_at
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam
