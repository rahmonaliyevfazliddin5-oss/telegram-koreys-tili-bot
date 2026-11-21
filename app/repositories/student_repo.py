import re
from typing import List, Optional
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.fine_ledger import FineLedger


async def get_student_debt(db: AsyncSession, student_id: int) -> int:
    """O'quvchining jami qarzini hisoblaydi (fines - payments >= 0)."""
    fines_stmt = select(func.coalesce(func.sum(FineLedger.amount), 0)).where(
        and_(FineLedger.student_id == student_id, FineLedger.type == "fine")
    )
    payments_stmt = select(func.coalesce(func.sum(FineLedger.amount), 0)).where(
        and_(FineLedger.student_id == student_id, FineLedger.type == "payment")
    )
    fines = (await db.execute(fines_stmt)).scalar_one()
    payments = (await db.execute(payments_stmt)).scalar_one()
    return max(0, int(fines - payments))


async def get_all_students(
    db: AsyncSession,
    search: Optional[str] = None,
    limit: int = 500,
    offset: int = 0
) -> List[Student]:
    """Barcha o'quvchilarni alifbo tartibida (familiya, ism) olish."""
    stmt = select(Student)
    if search:
        s_clean = re.sub(r"[‘’’ʻ`]", "%", search.strip())
        tokens = [t.strip() for t in s_clean.split() if t.strip()]
        for token in tokens:
            search_pattern = f"%{token}%"
            stmt = stmt.where(
                or_(
                    Student.first_name.ilike(search_pattern),
                    Student.last_name.ilike(search_pattern),
                    Student.grade.ilike(search_pattern)
                )
            )
    stmt = stmt.order_by(
        func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
        Student.first_name.asc()
    ).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_student_by_id(db: AsyncSession, student_id: int) -> Optional[Student]:
    """ID bo'yicha bitta o'quvchini olish."""
    stmt = select(Student).where(Student.id == student_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def create_student(
    db: AsyncSession,
    first_name: str,
    last_name: Optional[str] = None,
    grade: Optional[str] = None
) -> Student:
    """Yangi o'quvchi yaratish."""
    student = Student(
        first_name=first_name.strip(),
        last_name=last_name.strip() if last_name else "",
        grade=grade.strip() if grade else None
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def update_student(
    db: AsyncSession,
    student: Student,
    first_name: str,
    last_name: Optional[str] = None,
    grade: Optional[str] = None
) -> Student:
    """Mavjud o'quvchi ma'lumotlarini yangilash."""
    student.first_name = first_name.strip()
    student.last_name = last_name.strip() if last_name else ""
    student.grade = grade.strip() if grade else None
    await db.commit()
    await db.refresh(student)
    return student


async def delete_student(db: AsyncSession, student: Student) -> None:
    """O'quvchini butunlay o'chirish (hard delete + cascade)."""
    await db.delete(student)
    await db.commit()
