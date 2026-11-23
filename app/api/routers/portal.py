import logging
from typing import Optional, List, Dict, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.redis import get_redis
from redis.asyncio import Redis
from fastapi import Request
from app.config import settings
from app.api.auth import validate_init_data
from app.models.student import Student
from app.models.lesson import Lesson
from app.models.exam import Exam, ExamGrade
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.models.lesson_absence import LessonAbsence
from app.services.time_service import get_tashkent_now, is_weekend
from app.services.rating_service import calculate_and_cache_rating
from app.services.attendance_service import (
    get_all_students_derived_attendance_stats,
    get_student_derived_attendance_stats,
    finalize_pending_lessons,
    is_lesson_completed
)
from app.schemas.portal import (
    PortalLeaderboardResponse,
    PortalStudentRankItem,
    PortalAttendanceResponse,
    PortalLessonAttendance,
    PortalAttendanceStudent,
    PortalStudentsResponse,
    PortalStudentListItem,
    PortalStudentDetailResponse,
    PortalGradeItem,
    PortalExamItem,
    PortalTeacherNote,
    PortalTeacherResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/me")
async def get_portal_current_user(
    request: Request,
    redis: Redis = Depends(get_redis)
):
    """
    Joriy foydalanuvchining rolini (admin yoki ota-ona/foydalanuvchi) tekshirish.
    Admin bo'lish uchun Telegramda /admin buyrug'i va paroli kiritilgan bo'lishi shart.
    Aks holda hech kim admin panelga kira olmaydi va admin borligini ham ko'rmaydi.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return {"is_admin": False}

    init_data = auth_header
    if init_data.startswith("tma "):
        init_data = init_data[4:].strip()
    elif init_data.startswith("Bearer "):
        init_data = init_data[7:].strip()

    try:
        user_info = validate_init_data(init_data, settings.BOT_TOKEN)
        user_id = user_info.get("user_id")
        if user_id:
            session_key = f"admin_session:{user_id}"
            is_active = await redis.get(session_key)
            if is_active:
                return {"is_admin": True, "user_id": user_id}
    except Exception:
        pass

    return {"is_admin": False}


@router.get("/leaderboard", response_model=PortalLeaderboardResponse)
async def get_portal_leaderboard(
    db: AsyncSession = Depends(get_db)
):
    """
    Ota-onalar va foydalanuvchilar uchun umumiy reyting (faqat ochiq ma'lumotlar).
    """
    rating_list = await calculate_and_cache_rating(db)
    items = [
        PortalStudentRankItem(
            id=item["id"],
            rank=item["rank"],
            first_name=item["first_name"],
            last_name=item.get("last_name"),
            grade=item.get("grade"),
            total_score=item.get("total_score", 0),
            daily_score=item.get("daily_score", 0),
            exam_score=item.get("exam_score", 0)
        )
        for item in rating_list
    ]
    return PortalLeaderboardResponse(
        students=items,
        total_students=len(items),
        updated_at=get_tashkent_now().isoformat()
    )


@router.get("/attendance", response_model=PortalAttendanceResponse)
async def get_portal_attendance(
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Bugungi yoki tanlangan sanadagi darslar davomati xulosasi.
    """
    now = get_tashkent_now()
    cur_date = target_date or now.date()

    # O'tgan yakunlanmagan darslarni dangasa yakunlash
    try:
        await finalize_pending_lessons(db, now=now)
    except Exception as e:
        logger.warning(f"finalize_pending_lessons error: {e}")

    # Barcha o'quvchilar
    stud_stmt = select(Student).order_by(
        func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
        Student.first_name.asc()
    )
    students = (await db.execute(stud_stmt)).scalars().all()

    # Shu sanadagi darslar
    lessons_stmt = select(Lesson).where(Lesson.date == cur_date)
    lessons = (await db.execute(lessons_stmt)).scalars().all()
    lessons_map = {l.lesson_no: l for l in lessons}

    # Shu sanadagi baholar
    grades_stmt = select(Grade).where(Grade.date == cur_date)
    grades = (await db.execute(grades_stmt)).scalars().all()
    graded_set = {(g.student_id, g.lesson_no) for g in grades}

    # Shu sanadagi davomat belgilari
    marks_stmt = select(AttendanceMark).where(AttendanceMark.date == cur_date)
    marks = (await db.execute(marks_stmt)).scalars().all()
    late_map = {(m.student_id, m.lesson_no): m.late_minutes for m in marks if m.status == "late"}
    present_set = {(m.student_id, m.lesson_no) for m in marks if m.status == "present"}

    # Shu sanadagi rasmiy qoldirishlar
    absences_stmt = (
        select(LessonAbsence)
        .join(Lesson, LessonAbsence.lesson_id == Lesson.id)
        .where(Lesson.date == cur_date)
    )
    absences = (await db.execute(absences_stmt)).scalars().all()
    absence_map = {(a.student_id, a.lesson_id) for a in absences}

    lessons_payload = {}
    for lesson_no in (1, 2):
        lesson_obj = lessons_map.get(lesson_no)
        if not lesson_obj:
            lessons_payload[lesson_no] = PortalLessonAttendance(
                lesson_no=lesson_no,
                is_started=False,
                topic=None,
                attended_count=0,
                late_count=0,
                absent_count=0,
                students=[]
            )
            continue

        is_completed = is_lesson_completed(cur_date, lesson_no, now)
        attended_list = []
        late_list = []
        absent_list = []

        for s in students:
            # Dars slotiga mos keladimi?
            if s.lesson_slots is not None and s.lesson_slots not in (lesson_no, 3):
                continue
            # Dars boshlanishidan oldin ro'yxatda bo'lganmi?
            if s.created_at > lesson_obj.started_at:
                continue

            full_name = f"{s.first_name} {s.last_name or ''}".strip()

            if (s.id, lesson_no) in late_map:
                minutes = late_map[(s.id, lesson_no)]
                late_list.append(PortalAttendanceStudent(
                    id=s.id,
                    name=full_name,
                    grade=s.grade,
                    status="late",
                    late_minutes=minutes
                ))
            elif (s.id, lesson_no) in graded_set or (s.id, lesson_no) in present_set:
                attended_list.append(PortalAttendanceStudent(
                    id=s.id,
                    name=full_name,
                    grade=s.grade,
                    status="present"
                ))
            elif (s.id, lesson_obj.id) in absence_map or (is_completed and s.lesson_slots is not None):
                absent_list.append(PortalAttendanceStudent(
                    id=s.id,
                    name=full_name,
                    grade=s.grade,
                    status="absent"
                ))

        all_students_status = attended_list + late_list + absent_list
        lessons_payload[lesson_no] = PortalLessonAttendance(
            lesson_no=lesson_no,
            is_started=True,
            topic=lesson_obj.topic,
            attended_count=len(attended_list),
            late_count=len(late_list),
            absent_count=len(absent_list),
            students=all_students_status
        )

    return PortalAttendanceResponse(
        date=cur_date.strftime("%Y-%m-%d"),
        is_weekend=is_weekend(cur_date),
        lesson_1=lessons_payload[1],
        lesson_2=lessons_payload[2]
    )


@router.get("/students", response_model=PortalStudentsResponse)
async def get_portal_students(
    q: Optional[str] = Query(None, description="Qidiruv matni"),
    grade: Optional[str] = Query(None, description="Sinf bo'yicha filtr"),
    db: AsyncSession = Depends(get_db)
):
    """
    O'quvchilar ro'yxati (ota-onalar telefoni va qarzlari yashiringan holda).
    """
    ratings = await calculate_and_cache_rating(db)
    rating_map = {r["id"]: r for r in ratings}

    stats_map = await get_all_students_derived_attendance_stats(db)

    stmt = select(Student).order_by(
        func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
        Student.first_name.asc()
    )
    all_students = (await db.execute(stmt)).scalars().all()

    items = []
    q_clean = q.strip().lower() if q else ""
    grade_clean = grade.strip().lower() if grade else ""

    for s in all_students:
        # Sinf filtri
        if grade_clean and (not s.grade or grade_clean not in s.grade.lower()):
            continue

        # Matn bo'yicha qidiruv
        if q_clean:
            full_str = f"{s.first_name} {s.last_name or ''} {s.grade or ''}".lower()
            if q_clean not in full_str:
                continue

        r_info = rating_map.get(s.id, {})
        st_info = stats_map.get(s.id, {})

        items.append(PortalStudentListItem(
            id=s.id,
            first_name=s.first_name,
            last_name=s.last_name,
            grade=s.grade,
            rank=r_info.get("rank"),
            total_score=r_info.get("total_score", 0),
            absences_count=st_info.get("absences", 0),
            lates_count=st_info.get("lates", 0)
        ))

    # Reytingi borlarni balli bo'yicha saralash
    items.sort(key=lambda x: (-(x.total_score or 0), x.last_name or "", x.first_name))

    return PortalStudentsResponse(
        items=items,
        total=len(items)
    )


@router.get("/students/{student_id}", response_model=PortalStudentDetailResponse)
async def get_portal_student_detail(
    student_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    O'quvchi haqida batafsil ma'lumot (baho, reyting, qoldirishlar va o'qituvchi uy ishi/izohlari).
    Ota-ona raqami yoki qarzlar kabi shaxsiy ma'lumotlar kiritilmagan.
    """
    stmt = select(Student).where(Student.id == student_id)
    student = (await db.execute(stmt)).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    # Reyting
    ratings = await calculate_and_cache_rating(db)
    r_info = next((r for r in ratings if r["id"] == student_id), {})

    # Davomat statistikasi
    att_stats = await get_student_derived_attendance_stats(db, student_id)

    # Oxirgi dars baholari (oxirgi 15 ta)
    grades_stmt = (
        select(Grade)
        .where(Grade.student_id == student_id)
        .order_by(Grade.date.desc(), Grade.lesson_no.desc())
        .limit(15)
    )
    grades = (await db.execute(grades_stmt)).scalars().all()
    recent_grades = [
        PortalGradeItem(
            date=g.date.strftime("%Y-%m-%d"),
            lesson_no=g.lesson_no,
            value=g.value
        )
        for g in grades
    ]

    # Oxirgi imtihon baholari (oxirgi 10 ta)
    exams_stmt = (
        select(ExamGrade, Exam)
        .join(Exam, ExamGrade.exam_id == Exam.id)
        .where(ExamGrade.student_id == student_id)
        .order_by(Exam.date.desc())
        .limit(10)
    )
    exam_rows = (await db.execute(exams_stmt)).all()
    recent_exams = [
        PortalExamItem(
            date=exam.date.strftime("%Y-%m-%d"),
            name=exam.name,
            score=eg.value
        )
        for eg, exam in exam_rows
    ]

    # O'qituvchi tomonidan yozilgan uy ishi / izohlar (Lesson.homework)
    notes_stmt = (
        select(Lesson)
        .where(
            Lesson.homework.is_not(None),
            Lesson.homework != ""
        )
        .order_by(Lesson.date.desc(), Lesson.lesson_no.desc())
        .limit(10)
    )
    lessons_with_homework = (await db.execute(notes_stmt)).scalars().all()
    teacher_notes = [
        PortalTeacherNote(
            date=l.date.strftime("%Y-%m-%d"),
            lesson_no=l.lesson_no,
            topic=l.topic,
            homework=l.homework
        )
        for l in lessons_with_homework
    ]

    # Jami o'tilgan darslar soni va o'quvchi qatnashgan darslar soni
    total_teacher_lessons = (await db.execute(select(func.count(Lesson.id)))).scalar_one() or 0
    absences_cnt = att_stats.get("absences", 0)
    attended_lessons_count = max(0, total_teacher_lessons - absences_cnt)

    return PortalStudentDetailResponse(
        id=student.id,
        first_name=student.first_name,
        last_name=student.last_name,
        grade=student.grade,
        rank=r_info.get("rank"),
        total_score=r_info.get("total_score", 0),
        daily_score=r_info.get("daily_score", 0),
        exam_score=r_info.get("exam_score", 0),
        absences_count=absences_cnt,
        lates_count=att_stats.get("lates", 0),
        total_teacher_lessons=total_teacher_lessons,
        attended_lessons_count=attended_lessons_count,
        recent_grades=recent_grades,
        recent_exams=recent_exams,
        teacher_notes=teacher_notes
    )


@router.get("/teacher", response_model=PortalTeacherResponse)
async def get_portal_teacher_info(
    db: AsyncSession = Depends(get_db)
):
    """
    O'qituvchi haqidagi rasmiy ma'lumotlar.
    """
    total_lessons = (await db.execute(select(func.count(Lesson.id)))).scalar_one() or 0
    total_exams = (await db.execute(select(func.count(Exam.id)))).scalar_one() or 0

    return PortalTeacherResponse(
        name="Koreys tili o'qituvchisi",
        directions="TOPIK 1dan 6 darajagacha titki, ilki, sigi, maragi darslarida professional dars o'tadi.",
        prep="TOPIK imtihonlariga tayyorlov.",
        location="Farg'ona shahar Sohibqiron 245",
        phone="+998901644566",
        total_lessons=total_lessons,
        total_exams=total_exams
    )
