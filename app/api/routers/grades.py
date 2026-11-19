from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.grade import Grade
from app.models.student import Student
from app.schemas.grade import GradeCreate, GradeUpdate, GradeResponse
from app.services.cache_service import invalidate_rating_cache

router = APIRouter()


@router.get("", response_model=List[GradeResponse])
async def get_grades(
    grade_date: date = Query(..., alias="date", description="Baholar sanasi (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = (
        select(
            Grade.id,
            Grade.student_id,
            Grade.date,
            Grade.value,
            Grade.created_at,
            (Student.first_name + " " + Student.last_name).label("student_name")
        )
        .join(Student, Grade.student_id == Student.id)
        .where(Grade.date == grade_date)
        .order_by(Grade.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        GradeResponse(
            id=r.id,
            student_id=r.student_id,
            date=r.date,
            value=r.value,
            created_at=r.created_at,
            student_name=r.student_name
        )
        for r in rows
    ]


@router.post("", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
async def create_grade(
    payload: GradeCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    # O'quvchi mavjudligini tekshirish
    stmt = select(Student).where(Student.id == payload.student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    grade = Grade(
        student_id=payload.student_id,
        date=payload.date,
        value=payload.value
    )
    db.add(grade)
    await db.commit()
    await db.refresh(grade)

    # Reyting keshini tozalash
    await invalidate_rating_cache()

    return GradeResponse(
        id=grade.id,
        student_id=grade.student_id,
        date=grade.date,
        value=grade.value,
        created_at=grade.created_at,
        student_name=f"{student.first_name} {student.last_name}"
    )


@router.put("/{grade_id}", response_model=GradeResponse)
async def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
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

    # Reyting keshini tozalash
    await invalidate_rating_cache()

    return GradeResponse(
        id=grade.id,
        student_id=grade.student_id,
        date=grade.date,
        value=grade.value,
        created_at=grade.created_at
    )


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
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

    # Reyting keshini tozalash
    await invalidate_rating_cache()
    return None
