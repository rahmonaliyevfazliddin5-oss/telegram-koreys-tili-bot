import calendar
from datetime import date
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.lesson import Lesson
from app.models.exam import Exam, ExamGrade
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.models.lesson_absence import LessonAbsence
from app.schemas.teacher import (
    TeacherProfileResponse,
    TeacherDayCard,
    TeacherLessonItem,
    TeacherExamCard
)
from app.services.time_service import get_tashkent_now

router = APIRouter()

UZ_MONTHS = {
    1: "yanvar", 2: "fevral", 3: "mart", 4: "aprel", 5: "may", 6: "iyun",
    7: "iyul", 8: "avgust", 9: "sentyabr", 10: "oktyabr", 11: "noyabr", 12: "dekabr"
}

UZ_MONTH_NAMES_CAPITAL = {
    1: "Yanvar", 2: "Fevral", 3: "Mart", 4: "Aprel", 5: "May", 6: "Iyun",
    7: "Iyul", 8: "Avgust", 9: "Sentyabr", 10: "Oktyabr", 11: "Noyabr", 12: "Dekabr"
}

UZ_WEEKDAYS = {
    0: "Dushanba",
    1: "Seshanba",
    2: "Chorshanba",
    3: "Payshanba",
    4: "Juma",
    5: "Shanba",
    6: "Yakshanba"
}


@router.get("/profile", response_model=TeacherProfileResponse)
async def get_teacher_profile(
    month_str: Optional[str] = Query(None, alias="month", description="Oy (YYYY-MM formati)"),
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    O'qituvchi profili:
    - O'tgan darslar soni (lessons)
    - O'tkazilgan imtihonlar soni (exams)
    - Shu oydagi dushanba-juma ish kunlari va o'tilgan darslar (mavzular bilan)
    - Shu oydagi imtihonlar ro'yxati
    - Shanba va yakshanba ko'rsatilmaydi
    """
    now = get_tashkent_now()
    if not month_str:
        month_str = now.strftime("%Y-%m")

    try:
        parts = month_str.strip().split("-")
        year = int(parts[0])
        month = int(parts[1])
        if not (1 <= month <= 12 and 2000 <= year <= 2100):
            raise ValueError
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Noto'g'ri oy formati (YYYY-MM)"
        )

    # 1. Jami o'tgan darslar (boshlangan va mavzu kiritilgan)
    lessons_count_stmt = select(func.count(Lesson.id)).where(Lesson.topic.isnot(None))
    total_lessons = (await db.execute(lessons_count_stmt)).scalar_one() or 0

    # 2. Jami o'tkazilgan imtihonlar
    exams_count_stmt = select(func.count(Exam.id))
    total_exams = (await db.execute(exams_count_stmt)).scalar_one() or 0

    # 3. Oydagi ish kunlari chegarasi
    _, num_days = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)

    # Shu oydagi darslarni olish
    lessons_stmt = select(Lesson).where(
        and_(
            Lesson.date >= start_date,
            Lesson.date <= end_date
        )
    )
    lessons_res = await db.execute(lessons_stmt)
    month_lessons = lessons_res.scalars().all()
    lessons_dict = {(l.date, l.lesson_no): l for l in month_lessons}

    # Shu oydagi baholarni olish
    grades_stmt = select(Grade).where(
        and_(
            Grade.date >= start_date,
            Grade.date <= end_date
        )
    )
    grades_res = await db.execute(grades_stmt)
    month_grades = grades_res.scalars().all()

    # Shu oydagi davomat belgilarini olish
    att_stmt = select(AttendanceMark).where(
        and_(
            AttendanceMark.date >= start_date,
            AttendanceMark.date <= end_date
        )
    )
    att_res = await db.execute(att_stmt)
    month_att = att_res.scalars().all()

    # Shu oydagi imtihonlarni olish
    exams_stmt = select(Exam).where(
        and_(
            Exam.date >= start_date,
            Exam.date <= end_date
        )
    ).order_by(Exam.date.desc(), Exam.lesson_no.asc(), Exam.id.desc())
    exams_res = await db.execute(exams_stmt)
    month_exams = exams_res.scalars().all()
    exam_ids = [e.id for e in month_exams]

    exam_grades_map = {}
    if exam_ids:
        eg_stmt = select(ExamGrade).where(ExamGrade.exam_id.in_(exam_ids))
        eg_res = await db.execute(eg_stmt)
        for eg in eg_res.scalars().all():
            exam_grades_map.setdefault(eg.exam_id, []).append(eg.value)

    # Darslar bo'yicha hisoblar
    lesson_stats = {}
    for g in month_grades:
        key = (g.date, g.lesson_no)
        st = lesson_stats.setdefault(key, {"graded": set(), "attended": set(), "absent": set()})
        if g.value is not None:
            st["graded"].add(g.student_id)
            st["attended"].add(g.student_id)

    for a in month_att:
        key = (a.date, a.lesson_no)
        st = lesson_stats.setdefault(key, {"graded": set(), "attended": set(), "absent": set()})
        if a.status in ("present", "late"):
            st["attended"].add(a.student_id)
        elif a.status == "absent":
            st["absent"].add(a.student_id)

    # Ish kunlari (dushanba-juma) ro'yxatini shakllantirish
    workdays = []
    for day in range(1, num_days + 1):
        cur_date = date(year, month, day)
        # Shanba (5) va Yakshanba (6) ko'rsatilmaydi!
        if cur_date.weekday() >= 5:
            continue

        weekday_name = UZ_WEEKDAYS.get(cur_date.weekday(), "")
        date_formatted = f"{cur_date.day}-{UZ_MONTHS[cur_date.month]}, {weekday_name}"

        day_lessons = []
        for l_num, l_time in ((1, "07:00"), (2, "15:45")):
            if (cur_date, l_num) in lessons_dict:
                l_obj = lessons_dict[(cur_date, l_num)]
                t = l_obj.topic
                c_stats = lesson_stats.get((cur_date, l_num), {"graded": set(), "attended": set(), "absent": set()})
                att_c = len(c_stats["attended"])
                grd_c = len(c_stats["graded"])
                abs_c = len(c_stats["absent"])
                day_lessons.append(
                    TeacherLessonItem(
                        lesson_no=l_num,
                        time=l_time,
                        topic=t,
                        display=f"{l_num}-dars {l_time} — {t}",
                        attended_count=att_c,
                        graded_count=grd_c,
                        absent_count=abs_c,
                        homework=l_obj.homework
                    )
                )

        has_lessons = len(day_lessons) > 0
        empty_text = None if has_lessons else "Dars o'tilmagan"

        workdays.append(
            TeacherDayCard(
                date=cur_date.isoformat(),
                date_formatted=date_formatted,
                weekday_name=weekday_name,
                has_lessons=has_lessons,
                lessons=day_lessons,
                empty_text=empty_text
            )
        )

    # Imtihonlar kartalari
    exam_cards = []
    for e in month_exams:
        w_name = UZ_WEEKDAYS.get(e.date.weekday(), "")
        d_fmt = f"{e.date.day}-{UZ_MONTHS[e.date.month]}, {w_name}"
        scores = exam_grades_map.get(e.id, [])
        scored_vals = [s for s in scores if s is not None]
        avg_sc = round(sum(scored_vals) / len(scored_vals), 1) if scored_vals else None
        exam_cards.append(
            TeacherExamCard(
                id=e.id,
                date=e.date.isoformat(),
                date_formatted=d_fmt,
                lesson_no=e.lesson_no,
                name=e.name,
                topic=e.topic,
                attended_count=len(scored_vals),
                avg_score=avg_sc
            )
        )

    month_title = f"{UZ_MONTH_NAMES_CAPITAL[month]} {year}"

    return TeacherProfileResponse(
        total_lessons=total_lessons,
        total_exams=total_exams,
        current_month=month_str,
        month_name=month_title,
        workdays=workdays,
        exams=exam_cards
    )
