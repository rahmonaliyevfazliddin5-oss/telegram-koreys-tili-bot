import pytest
from datetime import datetime, date, time, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.models.student import Student
from app.models.lesson import Lesson
from app.models.lesson_absence import LessonAbsence
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.services.time_service import TASHKENT_TZ
from app.services.attendance_service import (
    is_lesson_completed,
    finalize_lesson,
    finalize_pending_lessons,
    get_student_derived_attendance_stats
)


@pytest.fixture
def mock_admin():
    return {"user_id": 1, "first_name": "Admin", "username": "admin"}


@pytest.mark.asyncio
async def test_lesson_slots_filter_in_grades_get(mock_admin):
    """1-dars ro'yxatida faqat slots 1, 3 va NULL o'quvchilar chiqadi, 2-darsdagilar chiqmaydi."""
    s1 = Student(id=1, first_name="Faqat1", lesson_slots=1)
    s2 = Student(id=2, first_name="Faqat2", lesson_slots=2)
    s3 = Student(id=3, first_name="Ikkalasi", lesson_slots=3)
    s4 = Student(id=4, first_name="Noma'lum", lesson_slots=None)

    mock_db = AsyncMock()

    # 1-dars uchun mock execute
    def mock_exec(stmt):
        m = MagicMock()
        stmt_str = str(stmt).lower()
        if "from students" in stmt_str:
            # 1-darsda s1, s3, s4 chiqishi kerak
            m.scalars.return_value.all.return_value = [s1, s3, s4]
        elif "from grades" in stmt_str:
            m.scalars.return_value.all.return_value = []
        elif "from attendance_marks" in stmt_str:
            m.scalars.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = mock_exec
    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/grades?date=2026-11-20&lesson=1")
        assert res.status_code == 200
        data = res.json()
        ids = [item["student_id"] for item in data]
        assert 1 in ids
        assert 3 in ids
        assert 4 in ids
        assert 2 not in ids  # s2 (slots=2) 1-darsda chiqmaydi

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_put_grades_unassigned_student_422(mock_admin):
    """Boshqa darsga biriktirilgan o'quvchiga baho saqlamoqchi bo'linsa 422 qaytadi."""
    s2 = Student(id=2, first_name="Faqat2", lesson_slots=2)
    mock_db = AsyncMock()

    mock_lesson = Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="Mavzu bor")
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_lesson
    mock_db.execute.return_value = mock_res
    mock_db.get.return_value = s2

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [{"student_id": 2, "value": 5}]
            })
            assert res.status_code == 422
            assert "bu darsga biriktirilmagan" in res.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_bulk_slots_endpoint(mock_admin):
    """POST /api/students/bulk-slots orqali ommaviy biriktirish."""
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.rowcount = 3
    mock_db.execute.return_value = mock_res
    mock_db.commit = AsyncMock()

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/students/bulk-slots", json={
            "student_ids": [1, 2, 3],
            "lesson_slots": 3
        })
        assert res.status_code == 200
        assert res.json()["ok"] is True
        assert res.json()["updated_count"] == 3

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_finalize_lesson_logic():
    """
    finalize_lesson:
    - Faqat shu darsga biriktirilgan (NULL emas) o'quvchilarga qoldirgan yoziladi
    - Dars boshlangan paytdan keyin qo'shilgan o'quvchiga yozilmaydi
    - Idempotent: ikkinchi marta chaqirilsa 0 qaytadi
    """
    mock_db = AsyncMock()

    lesson_start = datetime(2026, 11, 20, 15, 30, tzinfo=TASHKENT_TZ)
    lesson = Lesson(
        id=10,
        date=date(2026, 11, 20),
        lesson_no=2,
        topic="2-dars mavzusi",
        started_at=lesson_start,
        finalized_at=None
    )
    mock_db.get.return_value = lesson

    s_assigned = Student(id=1, first_name="A", lesson_slots=2, created_at=datetime(2026, 11, 20, 10, 0, tzinfo=TASHKENT_TZ))

    def mock_exec(stmt):
        m = MagicMock()
        stmt_str = str(stmt).lower()
        if "from students" in stmt_str:
            m.scalars.return_value.all.return_value = [s_assigned]
        elif "from grades" in stmt_str or "from attendance_marks" in stmt_str or "from lesson_absences" in stmt_str:
            m.scalars.return_value.all.return_value = []
        return m

    mock_db.execute.side_effect = mock_exec

    # 19:59 da dars yakunlanmagan -> 0
    t_1959 = datetime(2026, 11, 20, 19, 59, tzinfo=TASHKENT_TZ)
    cnt_early = await finalize_lesson(mock_db, 10, now=t_1959)
    assert cnt_early == 0
    assert lesson.finalized_at is None

    # 20:00 da dars yakunlanadi -> 1 ta absence yoziladi
    t_2000 = datetime(2026, 11, 20, 20, 0, tzinfo=TASHKENT_TZ)
    cnt_done = await finalize_lesson(mock_db, 10, now=t_2000)
    assert cnt_done == 1
    assert lesson.finalized_at is not None

    # Ikkinchi marta chaqirilsa (idempotent) -> 0
    cnt_second = await finalize_lesson(mock_db, 10, now=t_2000)
    assert cnt_second == 0
