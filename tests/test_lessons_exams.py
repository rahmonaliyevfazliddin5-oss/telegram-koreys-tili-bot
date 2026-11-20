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
from app.models.exam import Exam, ExamGrade
from app.models.student import Student


@pytest.fixture
def mock_admin():
    return {"user_id": 999, "first_name": "Teacher"}


@pytest.mark.asyncio
async def test_start_lesson_outside_window(mock_admin):
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    # 06:30 Tashkent time (lesson 1 starts at 07:00)
    fake_now = datetime(2026, 11, 20, 6, 30, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.lessons.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/lessons/start", json={
                "lesson_no": 1,
                "topic": "1-dars: Koreys tili alifbosi"
            })
            assert res.status_code == 403
            assert "oynasi yopiq" in res.json()["detail"]
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_start_lesson_on_weekend(mock_admin):
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    # Saturday 08:00
    fake_now = datetime(2026, 11, 21, 8, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.lessons.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/lessons/start", json={
                "lesson_no": 1,
                "topic": "Shanba darsi"
            })
            assert res.status_code == 403
            assert "Dam olish kuni" in res.json()["detail"]
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_start_lesson_success(mock_admin):
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    # No existing lesson
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    # Friday 08:30 (Window is open 07:00 - 12:00)
    fake_now = datetime(2026, 11, 20, 8, 30, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.lessons.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/lessons/start", json={
                "lesson_no": 1,
                "topic": "1-dars: Unli tovushlar va Hangeul"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["lesson_no"] == 1
            assert data["topic"] == "1-dars: Unli tovushlar va Hangeul"
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_exam_creation_and_modifier_validation(mock_admin):
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    mock_redis = AsyncMock()
    app.dependency_overrides[get_redis] = lambda: mock_redis

    # 1. Closed window for lesson 2 at 10:00 (lesson 2 window is 15:30 - 20:00)
    fake_now = datetime(2026, 11, 20, 10, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.exams.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/exams", json={
                "lesson_no": 2,
                "name": "Grammatika testi",
                "topic": "TOPIK I so'z boyligi"
            })
            assert res.status_code == 403

    # 2. Open window for lesson 1 at 10:00
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.api.routers.exams.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/exams", json={
                "lesson_no": 1,
                "name": "1-oraliq nazorat",
                "topic": "1-bob va 2-bob so'zlari"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["name"] == "1-oraliq nazorat"
            assert data["lesson_no"] == 1

    # 3. Validation rule: modifier without grade value MUST return 422
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.put("/api/exams/1/grades", json={
            "items": [
                {"student_id": 1, "value": None, "modifier": "plus"}
            ]
        })
        assert res.status_code == 422

    app.dependency_overrides.clear()
