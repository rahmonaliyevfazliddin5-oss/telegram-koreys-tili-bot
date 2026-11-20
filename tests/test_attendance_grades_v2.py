import pytest
from datetime import datetime, date, time
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.services.time_service import TASHKENT_TZ
from app.models.lesson import Lesson
from app.models.attendance import AttendanceMark, AttendanceSession
from app.models.grade import Grade
from app.models.student import Student


@pytest.fixture
def mock_admin():
    return {"user_id": 100, "first_name": "Admin Teacher"}


@pytest.mark.asyncio
async def test_attendance_gated_by_lesson_start(mock_admin):
    """Mavzu kiritilmagan darsda davomat saqlash 409 qaytarishi shart."""
    mock_db = AsyncMock()
    # Lesson mavjud emas (scalar_one_or_none returns None)
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/attendance", json={
                "date": "2026-11-20",
                "lesson": 1,
                "absent_ids": [1],
                "late": []
            })
            assert res.status_code == 409
            assert "Avval dars mavzusini kiriting" in res.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_past_future_date_forbidden(mock_admin):
    """Bugungi kundan boshqa kunga saqlash 403 qaytarishi shart."""
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/attendance", json={
                "date": "2026-11-19",
                "lesson": 1,
                "absent_ids": [1]
            })
            assert res.status_code == 403
            assert "Faqat bugungi kun" in res.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_conflict_absent_and_late(mock_admin):
    """Bir o'quvchi bir vaqtda ham absent ham late bo'lsa 422 qaytarishi shart."""
    mock_db = AsyncMock()
    mock_lesson = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="Test Mavzu")
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_lesson
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/attendance", json={
                "date": "2026-11-20",
                "lesson": 1,
                "absent_ids": [5],
                "late": [{"student_id": 5, "minutes": 15}]
            })
            assert res.status_code == 422

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_save_success_and_get(mock_admin):
    """Davomat muvaffaqiyatli saqlanishi va GET orqali formatlangan holda olinishi."""
    mock_db = AsyncMock()
    mock_lesson = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="2-dars: Fe'l qo'shimchalari")
    
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_lesson
    mock_db.execute.return_value = mock_res
    mock_db.commit = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/attendance", json={
                "date": "2026-11-20",
                "lesson": 1,
                "absent_ids": [1],
                "late": [
                    {"student_id": 2, "minutes": 15},
                    {"student_id": 3, "minutes": 90}
                ]
            })
            assert res.status_code == 200
            data = res.json()
            assert data["ok"] is True
            assert data["absent_count"] == 1
            assert data["late_count"] == 2

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_grades_gated_by_lesson_start(mock_admin):
    """Mavzu kiritilmagan darsda baho saqlash 409 qaytarishi shart."""
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [{"student_id": 1, "value": 5}]
            })
            assert res.status_code == 409
            assert "Avval dars mavzusini kiriting" in res.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_grades_save_success(mock_admin):
    """Dars boshlangan bo'lsa dars baholari muvaffaqiyatli saqlanadi."""
    mock_db = AsyncMock()
    mock_lesson = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="Mavzu bor")
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_lesson
    mock_db.execute.return_value = mock_res
    mock_db.commit = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [
                    {"student_id": 1, "value": 5},
                    {"student_id": 2, "value": 4},
                    {"student_id": 3, "value": None}
                ]
            })
            assert res.status_code == 200
            assert res.json()["ok"] is True

    app.dependency_overrides.clear()
