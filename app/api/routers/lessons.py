from datetime import date
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.lesson import Lesson
from app.schemas.lesson import LessonStartRequest, LessonUpdateRequest, LessonResponse
from app.services.time_service import get_tashkent_now, is_weekend, is_lesson_window_open
from app.services.cache_service import invalidate_all_caches

router = APIRouter()


@router.post("/start", response_model=LessonResponse)
async def start_lesson(
    payload: LessonStartRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = get_tashkent_now()
    today = now.date()

    if is_weekend(today):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dam olish kunida dars boshlash taqiqlangan"
        )

    if not is_lesson_window_open(payload.lesson_no, today, now.time()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{payload.lesson_no}-dars oynasi yopiq"
        )

    stmt = select(Lesson).where(Lesson.date == today, Lesson.lesson_no == payload.lesson_no)
    res = await db.execute(stmt)
    lesson = res.scalar_one_or_none()

    if lesson:
        lesson.topic = payload.topic
    else:
        lesson = Lesson(
            date=today,
            lesson_no=payload.lesson_no,
            topic=payload.topic,
            started_at=now,
            updated_at=now
        )
        db.add(lesson)

    await db.commit()
    await db.refresh(lesson)
    await invalidate_all_caches()
    return lesson


@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson_topic(
    lesson_id: int,
    payload: LessonUpdateRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = get_tashkent_now()
    today = now.date()

    stmt = select(Lesson).where(Lesson.id == lesson_id)
    res = await db.execute(stmt)
    lesson = res.scalar_one_or_none()

    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dars topilmadi")

    if lesson.date != today or is_weekend(today) or not is_lesson_window_open(lesson.lesson_no, today, now.time()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopilgan, mavzuni tahrirlash mumkin emas"
        )

    lesson.topic = payload.topic
    await db.commit()
    await db.refresh(lesson)
    await invalidate_all_caches()
    return lesson


@router.get("", response_model=List[LessonResponse])
async def get_lessons_by_date(
    date_str: str,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Noto'g'ri sana formati")

    stmt = select(Lesson).where(Lesson.date == target_date).order_by(Lesson.lesson_no)
    res = await db.execute(stmt)
    return list(res.scalars().all())
