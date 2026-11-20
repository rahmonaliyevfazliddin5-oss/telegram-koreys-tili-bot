from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.student import Student
from app.models.attendance import AttendanceMark
from app.models.grade import Grade
from app.models.exam import ExamGrade
from app.models.fine_ledger import FineLedger
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentProfileResponse,
    StudentStats,
    AttendanceHistoryItem,
    FineCreate,
    CollectCreate,
    LedgerResponse
)
from app.schemas.attendance import format_late_display
from app.services.cache_service import invalidate_all_caches

router = APIRouter()


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


@router.get("/rating")
async def get_students_rating(
    limit: int = Query(3, ge=1, le=100, description="Reytingdagi o'quvchilar soni (masalan 3 ta)"),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    O'quvchilar reytingi (FAQAT ball > 0 bo'lganlar).
    Bosh sahifa TOP-3 reyting kartasi uchun limit=3 qilib chaqiriladi.
    """
    from app.services.rating_service import calculate_and_cache_rating
    rating_list = await calculate_and_cache_rating(db)
    top_items = [item for item in (rating_list or []) if item.get("total_score", 0) > 0][:limit]
    return top_items


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


@router.get("/{student_id}/profile", response_model=StudentProfileResponse)
async def get_student_profile(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    O'quvchi profili (6 ta asosiy ko'rsatkich):
    1. Jami dars qoldirgan
    2. Jami kech qolgan
    3. Jami ball (dars baholari + imtihon baholari)
    4. Dars jarayonida olgan ball (faqat dars baholari)
    5. Imtihon bali (faqat imtihon baholari)
    6. Jami qarz
    Qo'shimcha: amallar tarixi va oxirgi davomat yozuvlari ro'yxati.
    """
    stmt = select(Student).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    # 1. Jami dars qoldirgan
    abs_stmt = select(func.count(AttendanceMark.id)).where(
        AttendanceMark.student_id == student_id,
        AttendanceMark.status == "absent"
    )
    total_absences = (await db.execute(abs_stmt)).scalar_one() or 0

    # 2. Jami kech qolgan
    late_stmt = select(func.count(AttendanceMark.id)).where(
        AttendanceMark.student_id == student_id,
        AttendanceMark.status == "late"
    )
    total_lates = (await db.execute(late_stmt)).scalar_one() or 0

    # 3. Dars jarayonida olgan ball (dars baholari yig'indisi)
    grades_stmt = select(func.coalesce(func.sum(Grade.value), 0)).where(Grade.student_id == student_id)
    daily_score = (await db.execute(grades_stmt)).scalar_one() or 0

    # 4. Imtihon bali (imtihon baholari yig'indisi, modifier e'tiborga olinmaydi)
    exam_grades_stmt = select(func.coalesce(func.sum(ExamGrade.value), 0)).where(ExamGrade.student_id == student_id)
    exam_score = (await db.execute(exam_grades_stmt)).scalar_one() or 0

    # 5. Jami ball = dars baholari + imtihon baholari
    total_score = int(daily_score + exam_score)

    # 6. Jami qarz
    total_debt = await get_student_debt(db, student_id)

    # Amallar tarixi (jarima va to'lovlar)
    ledger_stmt = (
        select(FineLedger)
        .where(FineLedger.student_id == student_id)
        .order_by(FineLedger.created_at.desc())
        .limit(50)
    )
    ledger_items = (await db.execute(ledger_stmt)).scalars().all()
    history = [
        {
            "id": item.id,
            "type": item.type,
            "amount": item.amount,
            "created_at": item.created_at
        }
        for item in ledger_items
    ]

    # Oxirgi davomat yozuvlari ro'yxati
    att_stmt = (
        select(AttendanceMark)
        .where(AttendanceMark.student_id == student_id)
        .order_by(AttendanceMark.date.desc(), AttendanceMark.lesson_no.desc())
        .limit(50)
    )
    att_records = (await db.execute(att_stmt)).scalars().all()
    attendance_history = [
        AttendanceHistoryItem(
            id=m.id,
            date=m.date.isoformat(),
            lesson=m.lesson_no,
            status=m.status,
            status_text="Kelmadi" if m.status == "absent" else (format_late_display(m.late_minutes) or "Kech qoldi"),
            late_minutes=m.late_minutes
        )
        for m in att_records
    ]

    student_dict = {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name or "",
        "grade": student.grade
    }

    stats = StudentStats(
        total_absences=int(total_absences),
        total_lates=int(total_lates),
        total_score=int(total_score),
        daily_score=int(daily_score),
        exam_score=int(exam_score),
        total_debt=total_debt
    )

    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name or "",
        "grade": student.grade,
        "total_absences": int(total_absences),
        "total_lates": int(total_lates),
        "total_score": int(total_score),
        "daily_score": int(daily_score),
        "exam_score": int(exam_score),
        "total_debt": total_debt,
        "student": student_dict,
        "stats": stats,
        "history": history,
        "attendance_history": attendance_history
    }


@router.post("/{student_id}/fine", response_model=LedgerResponse)
async def add_fine(
    student_id: int,
    payload: FineCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    O'quvchiga jarima belgilash (+10 000 so'm yoki ixtiyoriy musbat summa).
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    amount = payload.amount or 10000
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jarima summasi noldan katta bo'lishi shart"
        )

    ledger_entry = FineLedger(
        student_id=student_id,
        type="fine",
        amount=amount
    )
    db.add(ledger_entry)
    await db.commit()

    total_debt = await get_student_debt(db, student_id)
    await invalidate_all_caches()

    return {
        "ok": True,
        "student_id": student_id,
        "type": "fine",
        "amount": amount,
        "total_debt": total_debt,
        "stats": {"total_debt": total_debt}
    }


@router.post("/{student_id}/collect", response_model=LedgerResponse)
async def collect_debt(
    student_id: int,
    payload: CollectCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    O'quvchidan qarz undirish (to'lov kiritish).
    Jami qarz hech qachon manfiy bo'lmaydi.
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi topilmadi"
        )

    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To'lov summasi noldan katta bo'lishi shart"
        )

    current_debt = await get_student_debt(db, student_id)
    if current_debt <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O'quvchining qarzi mavjud emas"
        )

    if payload.amount > current_debt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"To'lov summasi ({payload.amount}) jami qarzdan ({current_debt}) oshib ketishi mumkin emas"
        )

    ledger_entry = FineLedger(
        student_id=student_id,
        type="payment",
        amount=payload.amount
    )
    db.add(ledger_entry)
    await db.commit()

    new_debt = await get_student_debt(db, student_id)
    await invalidate_all_caches()

    return {
        "ok": True,
        "student_id": student_id,
        "type": "payment",
        "amount": payload.amount,
        "total_debt": new_debt,
        "stats": {"total_debt": new_debt}
    }


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    student = Student(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip() if payload.last_name else "",
        grade=payload.grade.strip() if payload.grade else None
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    # Darhol barcha keshlarni tozalash (o'quvchi darhol ko'rinishi uchun)
    await invalidate_all_caches()
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
    student.last_name = payload.last_name.strip() if payload.last_name else ""
    student.grade = payload.grade.strip() if payload.grade else None

    await db.commit()
    await db.refresh(student)

    await invalidate_all_caches()
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    """
    O'quvchini butunlay o'chirish (Hard Delete + Cascade).
    attendance_marks, grades, exam_grades, fine_ledger avtomatik o'chadi.
    lessons va exams SAQLANADI.
    Redis keshlari darhol tozalanadi.
    """
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

    # Darhol keshlarni tozalash (reyting, bot ro'yxati, davomat)
    await invalidate_all_caches()
    return None
