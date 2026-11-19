from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.services.cache_service import invalidate_rating_cache

router = APIRouter()


@router.get("", response_model=List[StudentResponse])
async def get_students(
    search: Optional[str] = Query(None, description="Ism, familiya yoki sinf bo'yicha qidiruv"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Student)
    if search:
        search_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Student.first_name.ilike(search_term),
                Student.last_name.ilike(search_term),
                Student.grade.ilike(search_term)
            )
        )
    stmt = stmt.order_by(Student.last_name.asc(), Student.first_name.asc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )
    return student


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    student = Student(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        grade=payload.grade.strip()
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    # Reyting keshini tozalash
    await invalidate_rating_cache()
    return student


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    student.first_name = payload.first_name.strip()
    student.last_name = payload.last_name.strip()
    student.grade = payload.grade.strip()

    await db.commit()
    await db.refresh(student)

    # Reyting keshini tozalash
    await invalidate_rating_cache()
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    await db.delete(student)
    await db.commit()

    # Reyting keshini tozalash
    await invalidate_rating_cache()
    return None
