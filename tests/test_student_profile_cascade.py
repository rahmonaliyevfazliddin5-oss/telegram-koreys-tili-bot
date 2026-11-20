import pytest
from datetime import datetime, date
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.models.student import Student
from app.models.attendance import AttendanceMark
from app.models.grade import Grade
from app.models.exam import Exam, ExamGrade
from app.models.fine_ledger import FineLedger


@pytest.fixture
def mock_admin():
    return {"user_id": 1, "first_name": "Admin"}


@pytest.mark.asyncio
async def test_student_profile_six_metrics(mock_admin):
    """O'quvchi profili 6 ta asosiy metrika va davomat tarixini to'g'ri qaytarishi."""
    mock_db = AsyncMock()
    mock_student = Student(id=10, first_name="Ali", last_name="Valiyev", grade="11-B", created_at=datetime(2026, 1, 1, 0, 0))

    # Mocks for student, absences, lates, daily_score, exam_score, fines, payments, ledger, attendance marks
    def mock_execute(stmt):
        m_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "from students" in stmt_str and "where students.id" in stmt_str:
            m_res.scalar_one_or_none.return_value = mock_student
        elif "count(attendance_marks.id)" in stmt_str:
            m_res.scalar_one.return_value = 2
        elif "count(lessons.id)" in stmt_str:
            m_res.scalar_one.return_value = 2
        elif "from lessons" in stmt_str:
            from app.models.lesson import Lesson
            m_lesson = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, started_at=datetime(2026, 11, 20, 7, 0))
            m_res.scalars.return_value.all.return_value = [m_lesson]
        elif "sum(grades.value)" in stmt_str:
            m_res.scalar_one.return_value = 15
        elif "sum(exam_grades.value)" in stmt_str:
            m_res.scalar_one.return_value = 8
        elif "sum(fine_ledger.amount)" in stmt_str:
            if "fine" in stmt_str:
                m_res.scalar_one.return_value = 20000
            else:
                m_res.scalar_one.return_value = 10000
        elif "from fine_ledger" in stmt_str:
            m_res.scalars.return_value.all.return_value = []
        elif "from attendance_marks" in stmt_str:
            m_mark = AttendanceMark(
                id=1,
                student_id=10,
                date=date(2026, 11, 20),
                lesson_no=1,
                status="late",
                late_minutes=15
            )
            m_res.scalars.return_value.all.return_value = [m_mark]
        else:
            m_res.scalar_one_or_none.return_value = None
            m_res.scalars.return_value.all.return_value = []
        return m_res

    mock_db.execute.side_effect = mock_execute
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    with patch("app.api.routers.students.get_student_debt", new_callable=AsyncMock) as mock_debt:
        mock_debt.return_value = 10000
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/students/10/profile")
            assert res.status_code == 200
            data = res.json()
            assert data["first_name"] == "Ali"
            assert data["last_name"] == "Valiyev"
            assert data["total_absences"] == 2
            assert data["total_lates"] == 2
            assert data["daily_score"] == 15
            assert data["exam_score"] == 8
            assert data["total_score"] == 23  # 15 + 8
            assert data["total_debt"] == 10000  # from get_student_debt
            assert len(data["attendance_history"]) == 1
            assert data["attendance_history"][0]["status_text"] == "+15 daqiqa kech qoldi"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_student_delete_cascade_and_cache(mock_admin):
    """O'quvchi o'chirilganda 204 qaytishi va keshlar tozalanishi."""
    mock_db = AsyncMock()
    mock_student = Student(id=10, first_name="Ali", last_name="Valiyev", grade="11-B")
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_student
    mock_db.execute.return_value = mock_res
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    with patch("app.api.routers.students.invalidate_all_caches", new_callable=AsyncMock) as mock_inv:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.delete("/api/students/10")
            assert res.status_code == 204
            mock_db.delete.assert_called_once_with(mock_student)
            mock_db.commit.assert_called_once()
            mock_inv.assert_called_once()

    app.dependency_overrides.clear()
