import logging
from datetime import date
from typing import Dict, Any
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.redis import get_redis
from app.services.time_service import get_lesson_window_status, get_tashkent_now
from app.schemas.admin import StatusResponse
from app.models.lesson import Lesson
from app.models.exam import Exam

logger = logging.getLogger(__name__)

router = APIRouter()

UZ_WEEKDAYS = {
    0: "Dushanba",
    1: "Seshanba",
    2: "Chorshanba",
    3: "Payshanba",
    4: "Juma",
    5: "Shanba",
    6: "Yakshanba"
}


@router.get("", response_model=StatusResponse)
async def get_system_status(
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db)
):
    """
    Toshkent vaqti, dam olish kuni, dars oynalari va bugungi dars/imtihonlar holatini qaytaradi.
    """
    status_data = get_lesson_window_status()
    today = get_tashkent_now().date()
    status_data["is_rest_day"] = status_data.get("is_weekend", False)
    status_data["weekday_name"] = UZ_WEEKDAYS.get(today.weekday(), "")

    # Lessons query
    try:
        stmt = select(Lesson).where(Lesson.date == today)
        res = await db.execute(stmt)
        lessons = res.scalars().all()
        lessons_map = {l.lesson_no: l for l in lessons}

        if 1 in lessons_map:
            status_data["lesson_1"]["is_started"] = True
            status_data["lesson_1"]["topic"] = lessons_map[1].topic
            status_data["lesson_1"]["lesson_id"] = lessons_map[1].id
        else:
            status_data["lesson_1"]["is_started"] = False
            status_data["lesson_1"]["topic"] = None
            status_data["lesson_1"]["lesson_id"] = None

        if 2 in lessons_map:
            status_data["lesson_2"]["is_started"] = True
            status_data["lesson_2"]["topic"] = lessons_map[2].topic
            status_data["lesson_2"]["lesson_id"] = lessons_map[2].id
        else:
            status_data["lesson_2"]["is_started"] = False
            status_data["lesson_2"]["topic"] = None
            status_data["lesson_2"]["lesson_id"] = None

        exam_stmt = select(Exam).where(Exam.date == today).order_by(Exam.lesson_no, Exam.id)
        exam_res = await db.execute(exam_stmt)
        exams = exam_res.scalars().all()
        status_data["exams"] = [
            {
                "id": e.id,
                "lesson_no": e.lesson_no,
                "name": e.name,
                "topic": e.topic,
                "date": e.date.isoformat()
            }
            for e in exams
        ]
    except Exception as e:
        logger.warning(f"Status olishda DB xatoligi: {e}")
        status_data["exams"] = []

    # Global blok holatini tekshirish
    try:
        block_ttl = await redis.ttl("admin_block_global")
        if block_ttl and block_ttl > 0:
            status_data["is_blocked"] = True
            status_data["block_ttl"] = block_ttl
        else:
            status_data["is_blocked"] = False
            status_data["block_ttl"] = 0
    except Exception as e:
        logger.warning(f"Status tekshirishda Redis xatoligi: {e}")
        status_data["is_blocked"] = False
        status_data["block_ttl"] = 0

    return status_data
