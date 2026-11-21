from datetime import date, datetime
from typing import Optional, List, Dict
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson


async def get_lesson_by_date_and_no(db: AsyncSession, lesson_date: date, lesson_no: int) -> Optional[Lesson]:
    """Muayyan sana va dars raqami bo'yicha dars yozuvini olish."""
    stmt = select(Lesson).where(
        and_(
            Lesson.date == lesson_date,
            Lesson.lesson_no == lesson_no
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_lessons_map_for_date(db: AsyncSession, target_date: date) -> Dict[int, Lesson]:
    """Sana bo'yicha darslarni lesson_no bo'yicha lug'atda olish."""
    stmt = select(Lesson).where(Lesson.date == target_date)
    res = await db.execute(stmt)
    lessons = res.scalars().all()
    return {l.lesson_no: l for l in lessons}


async def create_lesson(
    db: AsyncSession,
    lesson_date: date,
    lesson_no: int,
    topic: str,
    started_at: datetime
) -> Lesson:
    """Yangi dars boshlash (yozuv yaratish)."""
    lesson = Lesson(
        date=lesson_date,
        lesson_no=lesson_no,
        topic=topic.strip(),
        started_at=started_at
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson
