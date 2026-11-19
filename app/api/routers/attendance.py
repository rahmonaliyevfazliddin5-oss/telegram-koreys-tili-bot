from datetime import date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, and_, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.student import Student
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceUpdate, AttendanceStudentItem

router = APIRouter()


@router.get("", response_model=List[AttendanceStudentItem])
async def get_attendance(
    attendance_date: date = Query(..., alias="date", description="Davomat sanasi (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = (
        select(
            Student.id.label("student_id"),
            Student.first_name,
            Student.last_name,
            Student.grade,
            Attendance.status
        )
        .outerjoin(
            Attendance,
            and_(Student.id == Attendance.student_id, Attendance.date == attendance_date)
        )
        .order_by(Student.last_name.asc(), Student.first_name.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        items.append(
            AttendanceStudentItem(
                student_id=row.student_id,
                first_name=row.first_name,
                last_name=row.last_name,
                grade=row.grade,
                status=row.status
            )
        )
    return items


@router.get("/{student_id}")
async def get_student_attendance(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Student).where(Student.id == student_id)
    student = (await db.execute(stmt)).scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )
    att_stmt = select(Attendance).where(Attendance.student_id == student_id).order_by(Attendance.date.desc())
    records = (await db.execute(att_stmt)).scalars().all()
    return [
        {"id": r.id, "student_id": r.student_id, "date": str(r.date), "status": r.status}
        for r in records
    ]


@router.put("", status_code=status.HTTP_200_OK)
@router.post("", status_code=status.HTTP_200_OK)
async def set_attendance(
    payload: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    # O'quvchi mavjudligini tekshirish
    stmt_student = select(Student).where(Student.id == payload.student_id)
    student_res = await db.execute(stmt_student)
    if not student_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    # Agar status null bo'lsa, davomat belgisini o'chirish
    if payload.status is None:
        stmt = delete(Attendance).where(
            and_(
                Attendance.student_id == payload.student_id,
                Attendance.date == payload.date
            )
        )
        await db.execute(stmt)
        await db.commit()
        return {"student_id": payload.student_id, "date": str(payload.date), "status": None}

    # Status present yoki absent bo'lsa Upsert
    stmt = insert(Attendance).values(
        student_id=payload.student_id,
        date=payload.date,
        status=payload.status
    ).on_conflict_do_update(
        constraint="uq_attendance_student_date",
        set_={"status": payload.status}
    )
    await db.execute(stmt)
    await db.commit()

    return {"student_id": payload.student_id, "date": str(payload.date), "status": payload.status}
