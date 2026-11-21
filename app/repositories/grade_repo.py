from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.grade import Grade
from app.models.exam import ExamGrade
from app.models.attendance import AttendanceMark


async def get_grades_map(db: AsyncSession, grade_date: date, lesson_no: int) -> Dict[int, Grade]:
    """Muayyan sana va dars bo'yicha baholarni student_id bo'yicha lug'atda qaytaradi."""
    stmt = select(Grade).where(
        and_(
            Grade.date == grade_date,
            Grade.lesson_no == lesson_no
        )
    )
    res = await db.execute(stmt)
    return {g.student_id: g for g in res.scalars().all()}


async def get_attendance_marks_map(db: AsyncSession, mark_date: date, lesson_no: int) -> Dict[int, AttendanceMark]:
    """Muayyan sana va dars bo'yicha davomat belgilarini student_id bo'yicha lug'atda qaytaradi."""
    stmt = select(AttendanceMark).where(
        and_(
            AttendanceMark.date == mark_date,
            AttendanceMark.lesson_no == lesson_no
        )
    )
    res = await db.execute(stmt)
    return {a.student_id: a for a in res.scalars().all()}


async def get_student_daily_score(db: AsyncSession, student_id: int) -> int:
    """O'quvchining dars jarayonida olgan ballari yig'indisi."""
    stmt = select(func.coalesce(func.sum(Grade.value), 0)).where(Grade.student_id == student_id)
    return (await db.execute(stmt)).scalar_one() or 0


async def get_student_exam_score(db: AsyncSession, student_id: int) -> int:
    """O'quvchining imtihonlarda to'plagan ballari yig'indisi."""
    stmt = select(func.coalesce(func.sum(ExamGrade.value), 0)).where(ExamGrade.student_id == student_id)
    return (await db.execute(stmt)).scalar_one() or 0
