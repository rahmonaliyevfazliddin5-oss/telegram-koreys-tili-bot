from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.student import Student
from app.models.attendance import AttendanceSession, AttendanceMark
from app.models.lesson import Lesson
from app.schemas.attendance import (
    AttendanceUpdate,
    AttendanceSessionUpdate,
    AttendanceStudentItem,
    AttendanceSessionResponse,
    LateStudentItem,
    format_late_display
)
from app.services.time_service import get_tashkent_now, is_weekend, is_lesson_window_open
from app.services.cache_service import invalidate_all_caches

router = APIRouter()


@router.get("", response_model=AttendanceSessionResponse)
async def get_attendance(
    attendance_date: Optional[date] = Query(None, alias="date", description="Davomat sanasi (YYYY-MM-DD)"),
    lesson: int = Query(1, ge=1, le=2, description="Dars tartib raqami (1 yoki 2)"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Muayyan sana va dars uchun davomat ma'lumotlarini qaytaradi.
    Kelmadi va kech qoldi attendance_marks jadvalida saqlanadi.
    Belgilanmagan o'quvchilar avtomatik kelgan hisoblanadi.
    """
    now = get_tashkent_now()
    if attendance_date is None:
        attendance_date = now.date()

    # 1. Dars mavzusi va boshlanganligi
    lesson_stmt = select(Lesson).where(
        and_(
            Lesson.date == attendance_date,
            Lesson.lesson_no == lesson
        )
    )
    lesson_res = await db.execute(lesson_stmt)
    lesson_obj = lesson_res.scalar_one_or_none()
    is_started = lesson_obj is not None
    topic = lesson_obj.topic if lesson_obj else None

    # 2. Sessiya saqlanganligini tekshirish
    session_stmt = select(AttendanceSession).where(
        and_(
            AttendanceSession.date == attendance_date,
            AttendanceSession.lesson_no == lesson
        )
    )
    sess_res = await db.execute(session_stmt)
    session_obj = sess_res.scalar_one_or_none()
    is_saved = session_obj is not None
    saved_at = session_obj.saved_at if session_obj else None

    # 3. Dars oynasi holati (faqat bugun + ish kuni + oyna ochiq)
    is_today = (attendance_date == now.date())
    window_open = is_today and (not is_weekend(attendance_date)) and is_lesson_window_open(lesson, target_date=attendance_date, current_time=now.time())

    # 4. Barcha o'quvchilarni olish
    students_stmt = select(Student).order_by(Student.last_name.asc(), Student.first_name.asc())
    students_res = await db.execute(students_stmt)
    all_students = students_res.scalars().all()

    # 5. Shu sana va dars uchun belgilangan belgilarni olish
    marks_stmt = select(AttendanceMark).where(
        and_(
            AttendanceMark.date == attendance_date,
            AttendanceMark.lesson_no == lesson
        )
    )
    marks_res = await db.execute(marks_stmt)
    marks = marks_res.scalars().all()
    marks_map = {m.student_id: m for m in marks}

    # 6. O'quvchilar ro'yxatini tuzish
    student_items = []
    absent_ids = []
    late_items = []

    for s in all_students:
        mark = marks_map.get(s.id)
        if mark:
            if mark.status == "absent":
                absent_ids.append(s.id)
                student_items.append(
                    AttendanceStudentItem(
                        student_id=s.id,
                        first_name=s.first_name,
                        last_name=s.last_name or "",
                        grade=s.grade,
                        is_absent=True,
                        status="absent",
                        late_minutes=None,
                        late_formatted=None
                    )
                )
            elif mark.status == "late":
                late_items.append(LateStudentItem(student_id=s.id, minutes=mark.late_minutes or 0))
                student_items.append(
                    AttendanceStudentItem(
                        student_id=s.id,
                        first_name=s.first_name,
                        last_name=s.last_name or "",
                        grade=s.grade,
                        is_absent=False,
                        status="late",
                        late_minutes=mark.late_minutes,
                        late_formatted=format_late_display(mark.late_minutes)
                    )
                )
            else:
                student_items.append(
                    AttendanceStudentItem(
                        student_id=s.id,
                        first_name=s.first_name,
                        last_name=s.last_name or "",
                        grade=s.grade,
                        is_absent=False,
                        status="present"
                    )
                )
        else:
            student_items.append(
                AttendanceStudentItem(
                    student_id=s.id,
                    first_name=s.first_name,
                    last_name=s.last_name or "",
                    grade=s.grade,
                    is_absent=False,
                    status="present"
                )
            )

    absent_count = len(absent_ids)
    late_count = len(late_items)
    total_students = len(all_students)
    # Kech qolganlar ham KELGAN hisoblanadi
    present_count = max(0, total_students - absent_count)
    percentage = round((present_count / total_students) * 100, 1) if total_students > 0 else 100.0

    return AttendanceSessionResponse(
        date=attendance_date,
        lesson=lesson,
        is_saved=is_saved,
        saved_at=saved_at,
        window_open=window_open,
        is_started=is_started,
        topic=topic,
        total_students=total_students,
        absent_count=absent_count,
        late_count=late_count,
        present_count=present_count,
        percentage=percentage,
        absent_ids=absent_ids,
        late=late_items,
        students=student_items
    )


@router.get("/{student_id}")
async def get_student_attendance(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Bitta o'quvchining dars qoldirish va kech qolish tarixini qaytaradi."""
    stmt = select(Student).where(Student.id == student_id)
    student = (await db.execute(stmt)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )
    att_stmt = select(AttendanceMark).where(AttendanceMark.student_id == student_id).order_by(AttendanceMark.date.desc(), AttendanceMark.lesson_no.desc())
    records = (await db.execute(att_stmt)).scalars().all()
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "date": str(r.date),
            "lesson": r.lesson_no,
            "status": r.status,
            "late_minutes": r.late_minutes,
            "late_formatted": format_late_display(r.late_minutes)
        }
        for r in records
    ]


@router.put("", status_code=status.HTTP_200_OK)
@router.post("", status_code=status.HTTP_200_OK)
async def set_attendance(
    payload: Union[AttendanceSessionUpdate, AttendanceUpdate],
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Davomatni ommaviy saqlash.
    Faqat bugun, ish kuni, oyna ochiq va dars mavzusi kiritilgan bo'lganda ishlaydi.
    """
    now = get_tashkent_now()
    today = now.date()

    # 1. Bugungi kun tekshiruvi
    if payload.date != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat bugungi kun uchun davomat saqlash mumkin"
        )

    # 2. Dam olish kuni tekshiruvi
    if is_weekend(today):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dam olish kunida davomat saqlash taqiqlangan"
        )

    # 3. Dars oynasi tekshiruvi
    if not is_lesson_window_open(payload.lesson, today, now.time()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{payload.lesson}-dars oynasi yopiq yoki dam olish kuni"
        )

    # 4. Dars mavzusi tekshiruvi (Dars boshlangan bo'lishi shart!)
    lesson_stmt = select(Lesson).where(
        and_(
            Lesson.date == today,
            Lesson.lesson_no == payload.lesson
        )
    )
    lesson_res = await db.execute(lesson_stmt)
    lesson_obj = lesson_res.scalar_one_or_none()
    if not lesson_obj or not lesson_obj.topic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Avval dars mavzusini kiriting"
        )

    # 5. Ommaviy saqlash
    # Unified absent_ids
    absent_ids = getattr(payload, "absent_ids", None)
    if absent_ids is None:
        absent_ids = getattr(payload, "absences", None) or getattr(payload, "absent_student_ids", None) or []
    absent_set = set(absent_ids)

    # Unified late list
    late_items = getattr(payload, "late", None) or []
    late_dict = {item.student_id: item.minutes for item in late_items}

    # Bir o'quvchi bir vaqtning o'zida ham kelmadi, ham kech qoldi bo'lolmaydi
    conflict = absent_set.intersection(late_dict.keys())
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O'quvchi bir vaqtning o'zida ham kelmadi, ham kech qoldi bo'lishi mumkin emas"
        )

    # 6. Shu sana va dars bo'yicha barcha eski belgilarni o'chirish
    del_stmt = delete(AttendanceMark).where(
        and_(
            AttendanceMark.date == today,
            AttendanceMark.lesson_no == payload.lesson
        )
    )
    await db.execute(del_stmt)

    # 7. Kelmaganlarni yozish
    for s_id in absent_set:
        db.add(AttendanceMark(
            student_id=s_id,
            date=today,
            lesson_no=payload.lesson,
            status="absent",
            late_minutes=None,
            created_at=now
        ))

    # 8. Kech qolganlarni yozish
    for s_id, mins in late_dict.items():
        db.add(AttendanceMark(
            student_id=s_id,
            date=today,
            lesson_no=payload.lesson,
            status="late",
            late_minutes=mins,
            created_at=now
        ))

    # 9. AttendanceSession ga yozish / yangilash
    sess_stmt = select(AttendanceSession).where(
        and_(
            AttendanceSession.date == today,
            AttendanceSession.lesson_no == payload.lesson
        )
    )
    sess_res = await db.execute(sess_stmt)
    sess = sess_res.scalar_one_or_none()
    if sess:
        sess.saved_at = now
    else:
        sess = AttendanceSession(
            date=today,
            lesson_no=payload.lesson,
            saved_at=now
        )
        db.add(sess)

    await db.commit()
    await invalidate_all_caches()

    return {
        "ok": True,
        "date": str(today),
        "lesson": payload.lesson,
        "absent_count": len(absent_set),
        "late_count": len(late_dict)
    }
