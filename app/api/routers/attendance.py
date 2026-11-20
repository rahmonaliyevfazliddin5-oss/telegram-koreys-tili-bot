from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.student import Student
from app.models.attendance import AttendanceSession, Absence
from app.schemas.attendance import (
    AttendanceUpdate,
    AttendanceSessionUpdate,
    AttendanceStudentItem,
    AttendanceSessionResponse
)
from app.services.time_service import get_tashkent_now, is_lesson_window_open

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
    Faqat kelmaganlar absences jadvalida saqlanadi.
    """
    if attendance_date is None:
        attendance_date = get_tashkent_now().date()

    # 1. Sessiya saqlanganligini tekshirish
    session_stmt = select(AttendanceSession).where(
        and_(
            AttendanceSession.date == attendance_date,
            AttendanceSession.lesson == lesson
        )
    )
    sess_res = await db.execute(session_stmt)
    session_obj = sess_res.scalar_one_or_none()
    is_saved = session_obj is not None
    saved_at = session_obj.saved_at if session_obj else None

    # 2. Dars oynasi holati
    window_open = is_lesson_window_open(lesson, target_date=attendance_date)

    # 3. Barcha o'quvchilarni olish
    students_stmt = select(Student).order_by(Student.last_name.asc(), Student.first_name.asc())
    students_res = await db.execute(students_stmt)
    all_students = students_res.scalars().all()

    # 4. Shu sana va dars uchun kelmaganlarni olish
    absences_stmt = select(Absence.student_id).where(
        and_(
            Absence.date == attendance_date,
            Absence.lesson == lesson
        )
    )
    abs_res = await db.execute(absences_stmt)
    absent_ids = set(abs_res.scalars().all())

    # 5. O'quvchilar ro'yxatini tuzish
    student_items = []
    for s in all_students:
        is_abs = s.id in absent_ids
        student_items.append(
            AttendanceStudentItem(
                student_id=s.id,
                first_name=s.first_name,
                last_name=s.last_name or "",
                grade=s.grade,
                is_absent=is_abs,
                status="absent" if is_abs else "present"
            )
        )

    absent_count = len(absent_ids)
    total_students = len(all_students)
    present_count = max(0, total_students - absent_count)
    percentage = round((present_count / total_students) * 100, 1) if total_students > 0 else 100.0

    return AttendanceSessionResponse(
        date=attendance_date,
        lesson=lesson,
        is_saved=is_saved,
        saved_at=saved_at,
        window_open=window_open,
        total_students=total_students,
        absent_count=absent_count,
        present_count=present_count,
        percentage=percentage,
        absent_ids=list(absent_ids),
        students=student_items
    )


@router.get("/{student_id}")
async def get_student_attendance(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Bitta o'quvchining dars qoldirish tarixini qaytaradi."""
    stmt = select(Student).where(Student.id == student_id)
    student = (await db.execute(stmt)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )
    att_stmt = select(Absence).where(Absence.student_id == student_id).order_by(Absence.date.desc(), Absence.lesson.desc())
    records = (await db.execute(att_stmt)).scalars().all()
    return [
        {"id": r.id, "student_id": r.student_id, "date": str(r.date), "lesson": r.lesson, "status": "absent"}
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
    Davomatni ommaviy yoki yakkama-yakka saqlash.
    Dars oynasi yopiq bo'lsa 403 Forbidden qaytariladi.
    Faqat kelmaganlar absences jadvalida saqlanadi.
    """
    # Dars oynasi tekshiruvi
    if not is_lesson_window_open(payload.lesson, target_date=payload.date):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopiq yoki dam olish kuni"
        )

    # Ommaviy saqlash (bulk save)
    if payload.absences is not None or payload.absent_student_ids is not None:
        raw_absences = payload.absences if payload.absences is not None else payload.absent_student_ids
        absent_set = set(raw_absences or [])

        # 1. attendance_sessions ga yozish (yoki yangilash)
        sess = await db.get(AttendanceSession, (payload.date, payload.lesson))
        if sess:
            sess.saved_at = datetime.now(timezone.utc)
        else:
            sess = AttendanceSession(
                date=payload.date,
                lesson=payload.lesson,
                saved_at=datetime.now(timezone.utc)
            )
            db.add(sess)

        # 2. Shu sana va dars bo'yicha barcha eski qoldirishlarni o'chirish
        del_stmt = delete(Absence).where(
            and_(
                Absence.date == payload.date,
                Absence.lesson == payload.lesson
            )
        )
        await db.execute(del_stmt)

        # 3. Yangi kelmaganlarni qo'shish
        for s_id in absent_set:
            db.add(Absence(
                student_id=s_id,
                date=payload.date,
                lesson=payload.lesson,
                created_at=datetime.now(timezone.utc)
            ))

        await db.commit()
        return {
            "ok": True,
            "date": str(payload.date),
            "lesson": payload.lesson,
            "absent_count": len(absent_set)
        }

    # Yakkama-yakka saqlash (bitta o'quvchi)
    if getattr(payload, "student_id", None) is not None:
        student_id = payload.student_id
        student = await db.get(Student, student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="O'quvchi topilmadi"
            )

        if payload.status == "absent":
            # Kelmagan qilib qo'shish
            stmt = select(Absence).where(
                and_(
                    Absence.student_id == student_id,
                    Absence.date == payload.date,
                    Absence.lesson == payload.lesson
                )
            )
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                db.add(Absence(
                    student_id=student_id,
                    date=payload.date,
                    lesson=payload.lesson,
                    created_at=datetime.now(timezone.utc)
                ))
        else:
            # Kelgan bo'lsa absences dan o'chirish
            await db.execute(
                delete(Absence).where(
                    and_(
                        Absence.student_id == student_id,
                        Absence.date == payload.date,
                        Absence.lesson == payload.lesson
                    )
                )
            )

        # Sessiyani belgilash
        sess = await db.get(AttendanceSession, (payload.date, payload.lesson))
        if sess:
            sess.saved_at = datetime.now(timezone.utc)
        else:
            sess = AttendanceSession(
                date=payload.date,
                lesson=payload.lesson,
                saved_at=datetime.now(timezone.utc)
            )
            db.add(sess)

        await db.commit()
        return {
            "ok": True,
            "student_id": student_id,
            "date": str(payload.date),
            "lesson": payload.lesson,
            "status": payload.status
        }

    return {"ok": True}
