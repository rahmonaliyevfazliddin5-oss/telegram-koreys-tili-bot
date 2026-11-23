from datetime import date, datetime, timezone
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.grade import Grade
from app.models.student import Student
from app.models.lesson import Lesson
from app.models.attendance import AttendanceMark
from app.services.attendance_service import format_late_display
from app.schemas.grade import (
    GradeCreate,
    GradeUpdate,
    GradeResponse,
    GradesBulkUpdate
)
from app.services.cache_service import invalidate_all_caches
from app.services.time_service import get_tashkent_now, is_weekend, is_lesson_window_open

router = APIRouter()


@router.get("")
async def get_grades(
    grade_date: Optional[date] = Query(None, alias="date", description="Baholar sanasi (YYYY-MM-DD)"),
    lesson: Optional[int] = Query(1, ge=1, le=2, description="Dars tartib raqami (1 yoki 2)"),
    kind: Optional[str] = Query("daily", description="Baho turi"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Belgilangan sana va dars bo'yicha kundalik dars baholarini qaytaradi.
    """
    if grade_date is None:
        grade_date = get_tashkent_now().date()

    # Shu darsga biriktirilgan (1-dars uchun [1, 3], 2-dars uchun [2, 3]) va belgilanmagan (NULL) o'quvchilar
    allowed_slots = [1, 3] if lesson == 1 else [2, 3]
    students_stmt = select(Student).where(
        or_(
            Student.lesson_slots.in_(allowed_slots),
            Student.lesson_slots.is_(None)
        )
    ).order_by(
        func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
        Student.first_name.asc()
    )
    students_res = await db.execute(students_stmt)
    all_students = students_res.scalars().all()

    # Shu sana va dars uchun baholarni olish
    grades_stmt = select(Grade).where(
        and_(
            Grade.date == grade_date,
            Grade.lesson_no == lesson
        )
    )
    grades_res = await db.execute(grades_stmt)
    grades_map = {g.student_id: g for g in grades_res.scalars().all()}

    # Shu sana va dars uchun davomat belgilarini olish
    att_stmt = select(AttendanceMark).where(
        and_(
            AttendanceMark.date == grade_date,
            AttendanceMark.lesson_no == lesson
        )
    )
    att_res = await db.execute(att_stmt)
    att_map = {a.student_id: a for a in att_res.scalars().all()}

    result = []
    for s in all_students:
        g = grades_map.get(s.id)
        val = g.value if g else None
        att = att_map.get(s.id)

        if att and att.status == "late":
            st = "late"
            late_min = att.late_minutes
        elif val is not None or (att and att.status == "present"):
            st = "present"
            late_min = None
        else:
            st = "absent"
            late_min = None

        full_name = f"{s.last_name} {s.first_name}".strip() if s.last_name else s.first_name

        result.append({
            "id": g.id if g else None,
            "student_id": s.id,
            "date": str(grade_date),
            "lesson": lesson,
            "kind": "daily",
            "value": val,
            "status": st,
            "late_minutes": late_min,
            "late_formatted": format_late_display(late_min) if st == "late" else None,
            "created_at": g.created_at.isoformat() if (g and g.created_at) else None,
            "first_name": s.first_name,
            "last_name": s.last_name or "",
            "grade": s.grade,
            "lesson_slots": s.lesson_slots,
            "student_name": full_name
        })

    return result


@router.get("/{grade_id}", response_model=GradeResponse)
async def get_grade(
    grade_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Bitta bahoni ID bo'yicha olish."""
    stmt = (
        select(
            Grade.id,
            Grade.student_id,
            Grade.date,
            Grade.lesson_no,
            Grade.value,
            Grade.created_at,
            (Student.first_name + " " + Student.last_name).label("student_name")
        )
        .join(Student, Grade.student_id == Student.id)
        .where(Grade.id == grade_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baho topilmadi"
        )
    return GradeResponse(
        id=row.id,
        student_id=row.student_id,
        date=row.date,
        lesson=row.lesson_no,
        value=row.value,
        created_at=row.created_at,
        student_name=row.student_name
    )


@router.put("", status_code=status.HTTP_200_OK)
async def bulk_save_grades(
    payload: GradesBulkUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Ommaviy baholash: berilgan dars uchun o'quvchilar baholarini saqlash.
    Faqat bugun, ish kuni, oyna ochiq va dars mavzusi kiritilgan bo'lganda ishlaydi.
    """
    now = get_tashkent_now()
    today = now.date()

    if payload.date != today:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat bugungi kun uchun baho saqlash mumkin"
        )

    if is_weekend(today):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dam olish kunida baholash taqiqlangan"
        )

    if not is_lesson_window_open(payload.lesson, today, now.time(), now=now):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopiq yoki dam olish kuni"
        )

    # Dars mavzusi tekshiruvi (Dars boshlangan bo'lishi shart!)
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

    if payload.homework is not None:
        lesson_obj.homework = payload.homework

    items = payload.items or []

    # 0. Darsga biriktirilganlik validatsiyasi (boshqa darsga tegishli bo'lsa 422)
    allowed_slots = [1, 3] if payload.lesson == 1 else [2, 3]
    for item in items:
        std = await db.get(Student, item.student_id)
        if isinstance(std, Student) and std.lesson_slots is not None and std.lesson_slots not in allowed_slots:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"O'quvchi (id={item.student_id}) bu darsga biriktirilmagan"
            )

    # 1. Server qoidalari validatsiyasi
    for item in items:
        st = item.status
        if st is None:
            if item.late_minutes is not None and item.late_minutes > 0:
                st = "late"
            elif item.value is not None:
                st = "present"
            else:
                st = "absent"

        if st == "absent":
            if item.value is not None or item.late_minutes is not None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Kelmadi holatida baho yoki kech qolish null bo'lishi shart"
                )
        elif st == "late":
            if item.late_minutes is None or not (1 <= item.late_minutes <= 600):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Kech qoldi holatida late_minutes 1 dan 600 gacha butun son bo'lishi shart"
                )
        elif st == "present":
            if item.late_minutes is not None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Keldi holatida late_minutes null bo'lishi shart"
                )

    # 2. Bitta tranzaksiyada saqlash
    for item in items:
        st = item.status
        if st is None:
            if item.late_minutes is not None and item.late_minutes > 0:
                st = "late"
            elif item.value is not None:
                st = "present"
            else:
                st = "absent"

        stmt = select(Grade).where(
            and_(
                Grade.student_id == item.student_id,
                Grade.date == today,
                Grade.lesson_no == payload.lesson
            )
        )
        existing_grade = (await db.execute(stmt)).scalar_one_or_none()

        if item.value is not None and 1 <= item.value <= 5 and st in ("present", "late"):
            if existing_grade:
                existing_grade.value = item.value
            else:
                db.add(Grade(
                    student_id=item.student_id,
                    date=today,
                    lesson_no=payload.lesson,
                    value=item.value,
                    created_at=now
                ))
        else:
            if existing_grade:
                await db.delete(existing_grade)

        att_stmt = select(AttendanceMark).where(
            and_(
                AttendanceMark.student_id == item.student_id,
                AttendanceMark.date == today,
                AttendanceMark.lesson_no == payload.lesson
            )
        )
        existing_att = (await db.execute(att_stmt)).scalar_one_or_none()

        if st == "late":
            if existing_att:
                existing_att.status = "late"
                existing_att.late_minutes = item.late_minutes
            else:
                db.add(AttendanceMark(
                    student_id=item.student_id,
                    date=today,
                    lesson_no=payload.lesson,
                    status="late",
                    late_minutes=item.late_minutes,
                    created_at=now
                ))
        elif st == "present":
            if item.value is None:
                if existing_att:
                    existing_att.status = "present"
                    existing_att.late_minutes = None
                else:
                    db.add(AttendanceMark(
                        student_id=item.student_id,
                        date=today,
                        lesson_no=payload.lesson,
                        status="present",
                        late_minutes=None,
                        created_at=now
                    ))
            else:
                if existing_att:
                    await db.delete(existing_att)
        elif st == "absent":
            if existing_att:
                await db.delete(existing_att)

    await db.commit()
    await invalidate_all_caches()
    return {"ok": True, "count": len(items)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_or_bulk_grades(
    payload: Union[GradesBulkUpdate, GradeCreate],
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Baho qo'yish (yakka yoki ommaviy)."""
    if isinstance(payload, GradesBulkUpdate) or hasattr(payload, "items") or hasattr(payload, "grades"):
        if isinstance(payload, GradeCreate):
            # Convert single create to bulk logic
            bulk_payload = GradesBulkUpdate(
                date=payload.date,
                lesson=payload.lesson,
                items=[GradeItem(student_id=payload.student_id, value=payload.value)]
            )
            return await bulk_save_grades(bulk_payload, db=db, admin=admin)
        return await bulk_save_grades(payload, db=db, admin=admin)

    return {"ok": True}
