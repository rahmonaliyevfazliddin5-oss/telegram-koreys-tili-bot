from datetime import date, datetime, timezone
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.grade import Grade
from app.models.student import Student
from app.schemas.grade import (
    GradeCreate,
    GradeUpdate,
    GradeResponse,
    GradesBulkUpdate
)
from app.services.cache_service import invalidate_rating_cache
from app.services.time_service import get_tashkent_now, is_lesson_window_open

router = APIRouter()


@router.get("")
async def get_grades(
    grade_date: Optional[date] = Query(None, alias="date", description="Baholar sanasi (YYYY-MM-DD)"),
    lesson: Optional[int] = Query(1, ge=1, le=2, description="Dars tartib raqami (1 yoki 2)"),
    kind: Optional[str] = Query("daily", pattern="^(daily|exam)$", description="Baho turi: daily yoki exam"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    Belgilangan sana, dars va baho turi bo'yicha baholarni qaytaradi.
    """
    if grade_date is None:
        grade_date = get_tashkent_now().date()

    stmt = (
        select(
            Grade.id,
            Grade.student_id,
            Grade.date,
            Grade.lesson,
            Grade.kind,
            Grade.value,
            Grade.created_at,
            Student.first_name,
            Student.last_name,
            Student.grade.label("student_class")
        )
        .join(Student, Grade.student_id == Student.id)
        .where(
            and_(
                Grade.date == grade_date,
                Grade.lesson == lesson,
                Grade.kind == kind
            )
        )
        .order_by(Student.last_name.asc(), Student.first_name.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "date": str(r.date),
            "lesson": r.lesson,
            "kind": r.kind,
            "value": r.value,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "first_name": r.first_name,
            "last_name": r.last_name or "",
            "grade": r.student_class,
            "student_name": f"{r.first_name} {r.last_name or ''}".strip()
        }
        for r in rows
    ]


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
            Grade.lesson,
            Grade.kind,
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
        lesson=row.lesson,
        kind=row.kind,
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
    Ommaviy baholash: berilgan dars va tur bo'yicha o'quvchilar baholarini saqlash.
    Dars oynasi yopiq bo'lsa 403 Forbidden qaytariladi.
    """
    if not is_lesson_window_open(payload.lesson, target_date=payload.date):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopiq yoki dam olish kuni"
        )

    for item in payload.grades:
        stmt = select(Grade).where(
            and_(
                Grade.student_id == item.student_id,
                Grade.date == payload.date,
                Grade.lesson == payload.lesson,
                Grade.kind == payload.kind
            )
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()

        if item.value is not None and 1 <= item.value <= 5:
            if existing:
                existing.value = item.value
            else:
                db.add(Grade(
                    student_id=item.student_id,
                    date=payload.date,
                    lesson=payload.lesson,
                    kind=payload.kind,
                    value=item.value
                ))
        elif item.value is None or item.value == 0:
            if existing:
                await db.delete(existing)

    await db.commit()
    await invalidate_rating_cache()
    return {"ok": True, "count": len(payload.grades)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_or_bulk_grades(
    payload: Union[GradesBulkUpdate, GradeCreate],
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Baho qo'yish (yakka yoki ommaviy)."""
    if isinstance(payload, GradesBulkUpdate) or hasattr(payload, "grades"):
        return await bulk_save_grades(payload, db=db, admin=admin)

    # Yakka baho
    if not is_lesson_window_open(payload.lesson, target_date=payload.date):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopiq yoki dam olish kuni"
        )

    # O'quvchi mavjudligini tekshirish
    student = await db.get(Student, payload.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    # Mavjud bahoni tekshirish
    stmt = select(Grade).where(
        and_(
            Grade.student_id == payload.student_id,
            Grade.date == payload.date,
            Grade.lesson == payload.lesson,
            Grade.kind == payload.kind
        )
    )
    grade = (await db.execute(stmt)).scalar_one_or_none()

    if grade:
        grade.value = payload.value
    else:
        grade = Grade(
            student_id=payload.student_id,
            date=payload.date,
            lesson=payload.lesson,
            kind=payload.kind,
            value=payload.value
        )
        db.add(grade)

    await db.commit()
    await db.refresh(grade)
    await invalidate_rating_cache()

    student_name = f"{student.first_name} {student.last_name or ''}".strip()
    return GradeResponse(
        id=grade.id,
        student_id=grade.student_id,
        date=grade.date,
        lesson=grade.lesson,
        kind=grade.kind,
        value=grade.value,
        created_at=grade.created_at,
        student_name=student_name
    )


@router.put("/{grade_id}", response_model=GradeResponse)
async def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Bitta bahoni yangilash."""
    stmt = select(Grade).where(Grade.id == grade_id)
    result = await db.execute(stmt)
    grade = result.scalar_one_or_none()

    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baho topilmadi"
        )

    grade.value = payload.value
    await db.commit()
    await db.refresh(grade)
    await invalidate_rating_cache()

    student = await db.get(Student, grade.student_id)
    student_name = f"{student.first_name} {student.last_name or ''}".strip() if student else ""

    return GradeResponse(
        id=grade.id,
        student_id=grade.student_id,
        date=grade.date,
        lesson=grade.lesson,
        kind=grade.kind,
        value=grade.value,
        created_at=grade.created_at,
        student_name=student_name
    )


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """Bahoni o'chirish."""
    stmt = select(Grade).where(Grade.id == grade_id)
    result = await db.execute(stmt)
    grade = result.scalar_one_or_none()

    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baho topilmadi"
        )

    await db.delete(grade)
    await db.commit()
    await invalidate_rating_cache()
    return None
