from datetime import date
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.exam import Exam, ExamGrade
from app.models.student import Student
from app.schemas.exam import (
    ExamCreateRequest,
    ExamUpdateRequest,
    ExamResponse,
    ExamGradeItem,
    ExamGradeStudentResponse,
    ExamGradesBulkRequest,
)
from app.services.time_service import get_tashkent_now, is_weekend, is_lesson_window_open
from app.services.cache_service import invalidate_all_caches

router = APIRouter()


@router.post("", response_model=ExamResponse)
async def create_exam(
    payload: ExamCreateRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = get_tashkent_now()
    today = now.date()
    exam_date = payload.date if payload.date is not None else today

    if is_weekend(exam_date):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dam olish kunida imtihon ochish taqiqlangan"
        )

    if not is_lesson_window_open(payload.lesson_no, exam_date, now.time(), now=now):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{payload.lesson_no}-dars oynasi yopiq, imtihon ochish taqiqlangan"
        )

    exam = Exam(
        date=exam_date,
        lesson_no=payload.lesson_no,
        name=payload.name,
        topic=payload.topic,
        created_at=now
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    await invalidate_all_caches()
    return exam


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    payload: ExamUpdateRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = get_tashkent_now()
    today = now.date()

    stmt = select(Exam).where(Exam.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()

    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imtihon topilmadi")

    if exam.date != today or is_weekend(today) or not is_lesson_window_open(exam.lesson_no, today, now.time(), now=now):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopilgan, imtihonni tahrirlash mumkin emas"
        )

    if payload.name is not None:
        exam.name = payload.name
    if payload.topic is not None:
        exam.topic = payload.topic

    await db.commit()
    await db.refresh(exam)
    await invalidate_all_caches()
    return exam


@router.get("", response_model=List[ExamResponse])
async def get_exams(
    date_str: Optional[str] = Query(None, alias="date"),
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Noto'g'ri sana formati")
    else:
        target_date = get_tashkent_now().date()

    stmt = select(Exam).where(Exam.date == target_date).order_by(Exam.id.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/{exam_id}/grades", response_model=List[ExamGradeStudentResponse])
async def get_exam_grades(
    exam_id: int,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    exam_stmt = select(Exam).where(Exam.id == exam_id)
    exam_res = await db.execute(exam_stmt)
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imtihon topilmadi")

    students_stmt = select(Student).order_by(
        func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
        Student.first_name.asc()
    )
    students_res = await db.execute(students_stmt)
    students = students_res.scalars().all()

    grades_stmt = select(ExamGrade).where(ExamGrade.exam_id == exam_id)
    grades_res = await db.execute(grades_stmt)
    grades_map = {g.student_id: g for g in grades_res.scalars().all()}

    response_items = []
    for s in students:
        g = grades_map.get(s.id)
        full_name = f"{s.last_name} {s.first_name}".strip() if s.last_name else s.first_name
        response_items.append(
            ExamGradeStudentResponse(
                student_id=s.id,
                student_name=full_name,
                first_name=s.first_name,
                last_name=s.last_name or "",
                grade=s.grade,
                value=g.value if g else None,
                modifier=g.modifier if g else None
            )
        )
    return response_items


@router.put("/{exam_id}/grades")
async def save_exam_grades(
    exam_id: int,
    payload: ExamGradesBulkRequest,
    admin: Dict[str, Any] = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = get_tashkent_now()
    today = now.date()

    exam_stmt = select(Exam).where(Exam.id == exam_id)
    exam_res = await db.execute(exam_stmt)
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imtihon topilmadi")

    if exam.date != today or is_weekend(today) or not is_lesson_window_open(exam.lesson_no, today, now.time(), now=now):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dars oynasi yopilgan, baholash mumkin emas"
        )

    # Fetch existing grades
    grades_stmt = select(ExamGrade).where(ExamGrade.exam_id == exam_id)
    grades_res = await db.execute(grades_stmt)
    existing_map = {g.student_id: g for g in grades_res.scalars().all()}

    for item in payload.items:
        if item.value is not None:
            if item.student_id in existing_map:
                grade = existing_map[item.student_id]
                grade.value = item.value
                grade.modifier = item.modifier
            else:
                new_grade = ExamGrade(
                    exam_id=exam_id,
                    student_id=item.student_id,
                    value=item.value,
                    modifier=item.modifier,
                    created_at=now
                )
                db.add(new_grade)
        else:
            if item.student_id in existing_map:
                await db.delete(existing_map[item.student_id])

    await db.commit()
    await invalidate_all_caches()
    return {"ok": True}
