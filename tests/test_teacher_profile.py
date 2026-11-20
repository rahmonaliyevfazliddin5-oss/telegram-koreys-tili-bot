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
from app.models.lesson import Lesson
from app.models.exam import Exam


@pytest.fixture
def mock_admin():
    return {"user_id": 1, "first_name": "Teacher"}


@pytest.mark.asyncio
async def test_teacher_profile_workdays_no_weekends(mock_admin):
    """O'qituvchi profilida faqat ish kunlari (dushanba-juma) chiqishi va shanba-yakshanba chiqmasligi."""
    mock_db = AsyncMock()

    # Total lessons: 5, total exams: 2
    # Lesson on 2026-11-20 (Juma, lesson 1)
    lesson_20 = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="Koreys tili kirish")
    # Exam on 2026-11-20 (lesson 1)
    exam_20 = Exam(id=1, date=date(2026, 11, 20), lesson_no=1, name="1-nazorat", topic="Alifbo testi")

    def mock_execute(stmt):
        m_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "count(lessons.id)" in stmt_str:
            m_res.scalar_one.return_value = 5
        elif "count(exams.id)" in stmt_str:
            m_res.scalar_one.return_value = 2
        elif "from lessons" in stmt_str:
            m_res.scalars.return_value.all.return_value = [lesson_20]
        elif "from exams" in stmt_str:
            m_res.scalars.return_value.all.return_value = [exam_20]
        else:
            m_res.scalars.return_value.all.return_value = []
        return m_res

    mock_db.execute.side_effect = mock_execute
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Noyabr 2026
        res = await client.get("/api/teacher/profile?month=2026-11")
        assert res.status_code == 200
        data = res.json()
        assert data["total_lessons"] == 5
        assert data["total_exams"] == 2
        assert data["current_month"] == "2026-11"
        assert "Noyabr 2026" in data["month_name"]

        # Tekshirish: workdays ro'yxatida birorta ham Shanba yoki Yakshanba yo'q!
        for day in data["workdays"]:
            assert day["weekday_name"] in ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma"]
            assert day["weekday_name"] not in ["Shanba", "Yakshanba"]

        # 20-noyabr (Juma) kuni dars bo'lgan
        day_20 = next(d for d in data["workdays"] if d["date"] == "2026-11-20")
        assert day_20["has_lessons"] is True
        assert len(day_20["lessons"]) == 1
        assert "1-dars 07:00 — Koreys tili kirish" in day_20["lessons"][0]["display"]

        # Boshqa dars o'tilmagan kun
        day_empty = next(d for d in data["workdays"] if d["date"] == "2026-11-19")
        assert day_empty["has_lessons"] is False
        assert day_empty["empty_text"] == "Dars o'tilmagan"

        # Imtihonlar ro'yxati
        assert len(data["exams"]) == 1
        assert data["exams"][0]["name"] == "1-nazorat"
        assert data["exams"][0]["topic"] == "Alifbo testi"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_teacher_profile_invalid_month(mock_admin):
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/teacher/profile?month=invalid-date")
        assert res.status_code == 400

    app.dependency_overrides.clear()
