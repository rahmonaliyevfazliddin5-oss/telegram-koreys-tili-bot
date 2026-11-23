import logging
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, and_, not_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.lesson import Lesson
from app.models.lesson_absence import LessonAbsence
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.services.time_service import get_tashkent_now, LESSON_1_END, LESSON_2_END
from app.services.cache_service import invalidate_all_caches
from app.config import settings

logger = logging.getLogger(__name__)


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


async def finalize_lesson(db: AsyncSession, lesson_id: int, now: Optional[datetime] = None) -> int:
    """
    Bitta darsni yakunlaydi (IDEMPOTENT, bitta tranzaksiyada).
    Shu darsga qatnashadigan (lesson_slots shu darsni o'z ichiga oladi, NULL emas) va
    dars boshlangan paytda ro'yxatda bo'lgan (created_at <= lessons.started_at) o'quvchilardan
    baho ham, kech qoldi belgisi ham, qo'lda Keldi belgisi ham yo'qlarini
    lesson_absences jadvaliga yozadi. lessons.finalized_at belgilanadi.
    """
    if now is None:
        now = get_tashkent_now()

    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        return 0

    # Allaqachon yakunlangan bo'lsa qayta ishlamaydi (idempotent)
    if lesson.finalized_at is not None:
        return 0

    # Dars vaqti tugagan bo'lishi shart
    if not is_lesson_completed(lesson.date, lesson.lesson_no, now):
        return 0

    lesson_no = lesson.lesson_no
    # Shu darsga biriktirilgan slots:
    # 1-dars: [1, 3]
    # 2-dars: [2, 3]
    # E'tibor bering: NULL (belgilanmagan) o'quvchilar hech qachon qoldirgan hisoblanmaydi!
    allowed_slots = [1, 3] if lesson_no == 1 else [2, 3]

    # Dars boshlangan paytda mavjud bo'lgan o'quvchilar
    stmt = (
        select(Student)
        .where(
            and_(
                Student.lesson_slots.in_(allowed_slots),
                Student.created_at <= lesson.started_at
            )
        )
    )
    res = await db.execute(stmt)
    students = res.scalars().all()

    if not students:
        lesson.finalized_at = now
        await db.commit()
        return 0

    student_ids = [s.id for s in students]

    # Shu dars uchun baholari bor o'quvchilar
    grades_stmt = select(Grade.student_id).where(
        and_(
            Grade.student_id.in_(student_ids),
            Grade.date == lesson.date,
            Grade.lesson_no == lesson_no
        )
    )
    grades_res = await db.execute(grades_stmt)
    graded_student_ids = set(grades_res.scalars().all())

    # Shu dars uchun davomat belgilari (keldi yoki late) bor o'quvchilar
    marks_stmt = select(AttendanceMark.student_id).where(
        and_(
            AttendanceMark.student_id.in_(student_ids),
            AttendanceMark.date == lesson.date,
            AttendanceMark.lesson_no == lesson_no
        )
    )
    marks_res = await db.execute(marks_stmt)
    marked_student_ids = set(marks_res.scalars().all())

    # Mavjud lesson_absences yozuvlari (dublikat bo'lmasligi uchun)
    existing_abs_stmt = select(LessonAbsence.student_id).where(
        LessonAbsence.lesson_id == lesson.id
    )
    existing_abs_res = await db.execute(existing_abs_stmt)
    existing_abs_ids = set(existing_abs_res.scalars().all())

    absent_count = 0
    for s in students:
        if s.id not in graded_student_ids and s.id not in marked_student_ids and s.id not in existing_abs_ids:
            db.add(LessonAbsence(
                lesson_id=lesson.id,
                student_id=s.id,
                created_at=now
            ))
            absent_count += 1

    lesson.finalized_at = now
    await db.commit()
    await invalidate_all_caches()
    return absent_count


async def finalize_pending_lessons(db: AsyncSession, now: Optional[datetime] = None) -> int:
    """
    Yakunlanmagan (finalized_at IS NULL), lekin vaqti o'tgan barcha darslarni 'dangasa' (lazy) yakunlaydi.
    """
    if now is None:
        now = get_tashkent_now()

    stmt = select(Lesson).where(Lesson.finalized_at.is_(None))
    res = await db.execute(stmt)
    lessons = res.scalars().all()

    total_finalized = 0
    for l in lessons:
        if is_lesson_completed(l.date, l.lesson_no, now):
            try:
                await finalize_lesson(db, l.id, now)
                total_finalized += 1
            except Exception as e:
                logger.error(f"Darsni yakunlashda xatolik (lesson_id={l.id}): {e}")
    return total_finalized


async def get_student_derived_attendance_stats(
    db: AsyncSession,
    student_id: int,
    student_created_at: Optional[datetime] = None,
    now: Optional[datetime] = None
) -> Tuple[int, int]:
    """
    Bitta o'quvchi uchun (jami_qoldirgan, jami_kech_qolgan) sonini qaytaradi.
    1. Vaqti o'tgan darslarni zaxira sifatida dangasa yakunlaydi.
    2. 'Jami dars qoldirgan' = lesson_absences soni.
    3. 'Jami kech qolgan' = attendance_marks (late) soni.
    """
    # Zaxira sifatida vaqti o'tgan darslarni yakunlash
    await finalize_pending_lessons(db, now)

    # 1. Jami kech qolgan
    late_stmt = select(func.count(AttendanceMark.id)).where(
        AttendanceMark.student_id == student_id,
        AttendanceMark.status == "late"
    )
    total_lates = (await db.execute(late_stmt)).scalar_one() or 0

    # 2. Jami dars qoldirgan (lesson_absences va count(lessons.id) mosligi bilan)
    abs_stmt = select(func.count(Lesson.id)).where(
        Lesson.id.in_(
            select(LessonAbsence.lesson_id).where(LessonAbsence.student_id == student_id)
        )
    )
    res_abs = await db.execute(abs_stmt)
    try:
        total_absences = res_abs.scalar_one() or 0
    except Exception:
        total_absences = res_abs.scalar_one_or_none() or 0

    return int(total_absences), int(total_lates)


async def get_all_students_derived_attendance_stats(
    db: AsyncSession,
    now: Optional[datetime] = None
) -> Dict[int, Dict[str, int]]:
    """
    Barcha o'quvchilar uchun davomat hisobi: {student_id: {"absences": count, "lates": count}}
    lesson_absences va attendance_marks jadvallaridan o'qiydi.
    """
    await finalize_pending_lessons(db, now)

    # Kech qolganlar
    lates_stmt = (
        select(AttendanceMark.student_id, func.count(AttendanceMark.id).label("lates_count"))
        .where(AttendanceMark.status == "late")
        .group_by(AttendanceMark.student_id)
    )
    lates_res = await db.execute(lates_stmt)
    lates_map = {row.student_id: row.lates_count for row in lates_res.all()}

    # Qoldirganlar (lesson_absences)
    abs_stmt = (
        select(LessonAbsence.student_id, func.count(LessonAbsence.id).label("absences_count"))
        .group_by(LessonAbsence.student_id)
    )
    abs_res = await db.execute(abs_stmt)
    abs_map = {row.student_id: row.absences_count for row in abs_res.all()}

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
    student_created_at: Optional[datetime] = None,
    now: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    O'quvchi profili uchun davomat yozuvlari ro'yxati:
    - Yakunlangan darslar: lesson_absences yozuvi bo'lsa 'Kelmadi'
    - AttendanceMark yozuvi bo'lsa '+15 daqiqa kech qoldi'
    """
    await finalize_pending_lessons(db, now)

    # 1. LessonAbsences (Kelmadi)
    abs_stmt = (
        select(LessonAbsence, Lesson)
        .join(Lesson, LessonAbsence.lesson_id == Lesson.id)
        .where(LessonAbsence.student_id == student_id)
    )
    abs_res = await db.execute(abs_stmt)
    history = []
    for abs_row, lesson_row in abs_res.all():
        history.append({
            "id": abs_row.id,
            "date": lesson_row.date.isoformat(),
            "lesson": lesson_row.lesson_no,
            "status": "absent",
            "late_minutes": None,
            "status_text": "Kelmadi"
        })

    # 2. AttendanceMarks (Kech qoldi)
    marks_stmt = (
        select(AttendanceMark)
        .where(
            and_(
                AttendanceMark.student_id == student_id,
                AttendanceMark.status == "late"
            )
        )
    )
    marks_res = await db.execute(marks_stmt)
    for m in marks_res.scalars().all():
        history.append({
            "id": m.id,
            "date": m.date.isoformat(),
            "lesson": m.lesson_no,
            "status": "late",
            "late_minutes": m.late_minutes,
            "status_text": format_late_display(m.late_minutes) or "Kech qoldi"
        })

    history.sort(key=lambda x: (x["date"], x["lesson"]), reverse=True)
    return history
