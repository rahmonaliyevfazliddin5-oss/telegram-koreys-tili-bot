import pytest
from datetime import date, datetime
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
from app.models.lesson import Lesson
from app.models.exam import Exam


@pytest.fixture
def mock_admin():
    return {"user_id": 1, "first_name": "Teacher"}


@pytest.mark.asyncio
async def test_student_parent_phone_and_debt_schema(mock_admin):
    """O'quvchida parent_phone va qarz hisoblanishi tekshiruvi."""
    mock_db = AsyncMock()
    mock_redis = AsyncMock()

    st1 = Student(
        id=1,
        first_name="Biloliddin",
        last_name="Odiljonov",
        grade="9",
        parent_phone="+998507540681",
        lesson_slots=1,
        created_at=datetime.now()
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [st1]
    
    # Ledger result
    mock_ledger = MagicMock()
    mock_ledger.all.return_value = [(1, "fine", 20000), (1, "payment", 10000)]

    async def mock_exec(stmt):
        s = str(stmt).lower()
        if "fine_ledger" in s:
            return mock_ledger
        return mock_result

    mock_db.execute.side_effect = mock_exec

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/students")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["first_name"] == "Biloliddin"
        assert data[0]["parent_phone"] == "+998507540681"
        assert data[0]["debt"] == 10000

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_collect_debt_validation(mock_admin):
    """Qarz undirishda summa musbat bo'lishi tekshiruvi."""
    mock_db = AsyncMock()
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/students/1/collect", json={"amount": 0})
        assert res.status_code == 422 or res.status_code == 400

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_exam_creation_with_date(mock_admin):
    """Imtihon ochishda JSON decode xatosiz ishlashi va date uzatilishi."""
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_redis = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    with patch("app.api.routers.exams.is_weekend", return_value=False), \
         patch("app.api.routers.exams.is_lesson_window_open", return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post("/api/exams", json={
                "date": "2026-11-23",
                "lesson_no": 2,
                "name": "2-oraliq nazorat",
                "topic": "Sigi va Ilki"
            })
            assert res.status_code == 200
            data = res.json()
            assert data["name"] == "2-oraliq nazorat"
            assert data["lesson_no"] == 2

            # 2. MM/DD/YYYY formatidagi sana va /api/exams/ (trailing slash) bilan tekshirish
            res2 = await client.post("/api/exams/", json={
                "date": "11/23/2026",
                "lesson_no": 1,
                "name": "Oraliq test",
                "topic": "Mavzular 1-5"
            })
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["name"] == "Oraliq test"
            assert data2["date"] == "2026-11-23"

            # 3. Bo'sh date kiritilganda xatosiz bugungi kunga tushishi
            res3 = await client.post("/api/exams", json={
                "date": "",
                "lesson_no": 2,
                "name": "Yakuniy test",
                "topic": "Yakuniy baholash"
            })
            assert res3.status_code == 200

    app.dependency_overrides.clear()
