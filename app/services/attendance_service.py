from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, and_, not_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.lesson import Lesson
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.services.time_service import get_tashkent_now, LESSON_1_END, LESSON_2_END


def is_lesson_completed(lesson_date: date, lesson_no: int, now: Optional[datetime] = None) -> bool:
    """
    Dars yakunlanganligini tekshiradi:
    - O'tgan kunlar doim yakunlangan
    - Bugungi kun: 1-dars 12:00 dan keyin, 2-dars 20:00 dan keyin yakunlangan
    - Kelajak kunlar: hali yakunlanmagan
    """
    if now is None:
        now = get_tashkent_now()
    today = now.date()
    if lesson_date < today:
        return True
    if lesson_date == today:
        current_time = now.time()
        if lesson_no == 1:
            return current_time >= LESSON_1_END
        elif lesson_no == 2:
            return current_time >= LESSON_2_END
    return False


async def get_student_derived_attendance_stats(
    db: AsyncSession,
    student_id: int,
    student_created_at: Optional[datetime] = None
) -> Tuple[int, int]:
    """
    Bitta o'quvchi uchun (jami_qoldirgan, jami_kech_qolgan) sonini qaytaradi.
    Qoldirgan darslar FAQAT yakunlangan va o'quvchi ro'yxatda bo'lgan darslardan hosil qilinadi.
    """
    now = get_tashkent_now()
    today = now.date()
    current_time = now.time()

    # 1. Jami kech qolgan
    late_stmt = select(func.count(AttendanceMark.id)).where(
        AttendanceMark.student_id == student_id,
        AttendanceMark.status == "late"
    )
    total_lates = (await db.execute(late_stmt)).scalar_one() or 0

    # 2. Jami dars qoldirgan
    if student_created_at is not None:
        created_at = student_created_at
    else:
        std_stmt = select(Student.created_at).where(Student.id == student_id)
        res = (await db.execute(std_stmt)).scalar_one_or_none()
        if hasattr(res, "created_at"):
            created_at = res.created_at
        else:
            created_at = res

    if created_at is not None and not isinstance(created_at, (datetime, date)):
        created_at = None

    completed_cond = (
        (Lesson.date < today) |
        (
            (Lesson.date == today) &
            (
                ((Lesson.lesson_no == 1) & (current_time >= LESSON_1_END)) |
                ((Lesson.lesson_no == 2) & (current_time >= LESSON_2_END))
            )
        )
    )

    has_grade = exists().where(
        and_(
            Grade.student_id == student_id,
            Grade.date == Lesson.date,
            Grade.lesson_no == Lesson.lesson_no
        )
    )

    has_mark = exists().where(
        and_(
            AttendanceMark.student_id == student_id,
            AttendanceMark.date == Lesson.date,
            AttendanceMark.lesson_no == Lesson.lesson_no
        )
    )

    conds = [completed_cond, not_(has_grade), not_(has_mark)]
    if created_at is not None:
        conds.append(Lesson.started_at >= created_at)

    abs_stmt = select(func.count(Lesson.id)).where(*conds)
    total_absences = (await db.execute(abs_stmt)).scalar_one() or 0

    return int(total_absences), int(total_lates)


async def get_all_students_derived_attendance_stats(db: AsyncSession) -> Dict[int, Dict[str, int]]:
    """
    Barcha o'quvchilar uchun davomat hisobi: {student_id: {"absences": count, "lates": count}}
    """
    now = get_tashkent_now()
    today = now.date()
    current_time = now.time()

    completed_cond = (
        (Lesson.date < today) |
        (
            (Lesson.date == today) &
            (
                ((Lesson.lesson_no == 1) & (current_time >= LESSON_1_END)) |
                ((Lesson.lesson_no == 2) & (current_time >= LESSON_2_END))
            )
        )
    )

    # Kech qolganlar
    lates_stmt = (
        select(AttendanceMark.student_id, func.count(AttendanceMark.id).label("lates_count"))
        .where(AttendanceMark.status == "late")
        .group_by(AttendanceMark.student_id)
    )
    lates_res = await db.execute(lates_stmt)
    lates_map = {row.student_id: row.lates_count for row in lates_res.all()}

    # Qoldirganlar
    has_grade = exists().where(
        and_(
            Grade.student_id == Student.id,
            Grade.date == Lesson.date,
            Grade.lesson_no == Lesson.lesson_no
        )
    )
    has_mark = exists().where(
        and_(
            AttendanceMark.student_id == Student.id,
            AttendanceMark.date == Lesson.date,
            AttendanceMark.lesson_no == Lesson.lesson_no
        )
    )

    abs_stmt = (
        select(Student.id, func.count(Lesson.id).label("absences_count"))
        .join(Lesson, Student.created_at <= Lesson.started_at)
        .where(
            completed_cond,
            not_(has_grade),
            not_(has_mark)
        )
        .group_by(Student.id)
    )
    abs_res = await db.execute(abs_stmt)
    abs_map = {row.id: row.absences_count for row in abs_res.all()}

    all_students_stmt = select(Student.id)
    all_ids = (await db.execute(all_students_stmt)).scalars().all()

    return {
        sid: {
            "absences": int(abs_map.get(sid, 0)),
            "lates": int(lates_map.get(sid, 0))
        }
        for sid in all_ids
    }


def format_late_display(minutes: Optional[int]) -> str:
    if not minutes:
        return ""
    if minutes < 60:
        return f"+{minutes} daqiqa kech qoldi"
    hours = minutes // 60
    rem = minutes % 60
    if rem == 0:
        return f"+{hours} soat kech qoldi"
    return f"+{hours} soat {rem} daqiqa kech qoldi"


async def get_student_attendance_history(
    db: AsyncSession,
    student_id: int,
    student_created_at: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    O'quvchi profili uchun davomat yozuvlari ro'yxati:
    - Har yakunlangan dars: 'Kelmadi' (hosil qilingan) yoki '+15 daqiqa kech qoldi'
    """
    now = get_tashkent_now()
    today = now.date()
    current_time = now.time()

    if student_created_at is not None:
        created_at = student_created_at
    else:
        std_stmt = select(Student.created_at).where(Student.id == student_id)
        res = (await db.execute(std_stmt)).scalar_one_or_none()
        if hasattr(res, "created_at"):
            created_at = res.created_at
        else:
            created_at = res

    if created_at is not None and not isinstance(created_at, (datetime, date)):
        created_at = None

    completed_cond = (
        (Lesson.date < today) |
        (
            (Lesson.date == today) &
            (
                ((Lesson.lesson_no == 1) & (current_time >= LESSON_1_END)) |
                ((Lesson.lesson_no == 2) & (current_time >= LESSON_2_END))
            )
        )
    )

    # 1. Yakunlangan darslar
    lesson_conds = [completed_cond]
    if created_at is not None:
        lesson_conds.append(Lesson.started_at >= created_at)

    lessons_stmt = (
        select(Lesson)
        .where(*lesson_conds)
        .order_by(Lesson.date.desc(), Lesson.lesson_no.desc())
    )
    lessons = (await db.execute(lessons_stmt)).scalars().all()

    # 2. O'quvchining baholari va belgilari
    grades_stmt = select(Grade).where(Grade.student_id == student_id)
    grades = (await db.execute(grades_stmt)).scalars().all()
    grades_set = {(g.date, g.lesson_no) for g in grades}

    marks_stmt = select(AttendanceMark).where(AttendanceMark.student_id == student_id)
    marks = (await db.execute(marks_stmt)).scalars().all()
    marks_map = {(m.date, m.lesson_no): m for m in marks}

    history = []
    for l in lessons:
        key = (l.date, l.lesson_no)
        mark = marks_map.get(key)
        if mark and mark.status == "late":
            history.append({
                "id": mark.id,
                "date": l.date.isoformat(),
                "lesson": l.lesson_no,
                "status": "late",
                "late_minutes": mark.late_minutes,
                "status_text": format_late_display(mark.late_minutes) or "Kech qoldi"
            })
        elif key not in grades_set and (not mark or mark.status != "present"):
            history.append({
                "id": l.id,
                "date": l.date.isoformat(),
                "lesson": l.lesson_no,
                "status": "absent",
                "late_minutes": None,
                "status_text": "Kelmadi"
            })

    history.sort(key=lambda x: (x["date"], x["lesson"]), reverse=True)
    return history
