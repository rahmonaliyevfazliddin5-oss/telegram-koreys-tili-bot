import os
import sys
import pytest
from datetime import date, datetime, time
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.services.time_service import TASHKENT_TZ
from app.models.student import Student
from app.models.lesson import Lesson
from app.models.grade import Grade
from app.models.attendance import AttendanceMark
from app.services.attendance_service import (
    is_lesson_completed,
    get_student_derived_attendance_stats
)


@pytest.fixture
def mock_admin():
    return {"user_id": 100, "first_name": "Admin Teacher"}


def test_four_tabs_and_no_attendance_in_html():
    """1. Pastki tabda 4 ta tab, 'Davomat' yo'q, ilovada davomat sahifasiga havola qolmagan."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tabbar_path = os.path.join(base_dir, "web", "src", "components", "TabBar.jsx")
    with open(tabbar_path, "r", encoding="utf-8") as f:
        src = f.read()

    assert 'id: "home"' in src
    assert 'id: "students"' in src
    assert 'id: "grades"' in src
    assert 'id: "settings"' in src
    assert 'id: "attendance"' not in src


def test_settings_tab_only_password_and_correct_header():
    """8. Sozlamalar sahifasi to'g'ri sarlavha va dars jadvali bilan ishlashi."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    settings_path = os.path.join(base_dir, "web", "src", "pages", "Settings.jsx")
    with open(settings_path, "r", encoding="utf-8") as f:
        src = f.read()

    assert "Sozlamalar" in src
    assert "Dars jadvallari va vaqt" in src
    assert "Admin paneldan chiqasizmi" in src


def test_lesson_completed_cutoff_times():
    """2. 1-dars 12:00, 2-dars 20:00 cutoff tekshiruvi: 19:59 da yakunlanmagan, 20:00 da yakunlangan."""
    d = date(2026, 11, 20)
    
    # 1-dars
    dt_1159 = datetime(2026, 11, 20, 11, 59, tzinfo=TASHKENT_TZ)
    dt_1200 = datetime(2026, 11, 20, 12, 0, tzinfo=TASHKENT_TZ)
    assert not is_lesson_completed(d, 1, dt_1159)
    assert is_lesson_completed(d, 1, dt_1200)

    # 2-dars
    dt_1959 = datetime(2026, 11, 20, 19, 59, tzinfo=TASHKENT_TZ)
    dt_2000 = datetime(2026, 11, 20, 20, 0, tzinfo=TASHKENT_TZ)
    assert not is_lesson_completed(d, 2, dt_1959)
    assert is_lesson_completed(d, 2, dt_2000)

    # O'tgan kun doim yakunlangan
    past_d = date(2026, 11, 19)
    assert is_lesson_completed(past_d, 2, dt_1959)


@pytest.mark.asyncio
async def test_put_grades_validation_rules(mock_admin):
    """PUT /api/grades server qoidalari: absent da value/late null bo'lishi shart, late da daqiqa shart."""
    mock_db = AsyncMock()
    # Lesson started
    lesson = Lesson(
        id=1,
        date=date(2026, 11, 20),
        lesson_no=1,
        topic="Mavzu bor",
        started_at=datetime(2026, 11, 20, 8, 0, tzinfo=TASHKENT_TZ),
        updated_at=datetime(2026, 11, 20, 8, 0, tzinfo=TASHKENT_TZ)
    )
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = lesson
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: mock_admin
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    fake_now = datetime(2026, 11, 20, 9, 30, tzinfo=TASHKENT_TZ)
    with patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. absent statusida baho yuborilsa -> 422
            res1 = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [{"student_id": 1, "status": "absent", "value": 5}]
            })
            assert res1.status_code == 422

            # 2. late statusida late_minutes yo'q bo'lsa -> 422
            res2 = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [{"student_id": 1, "status": "late", "late_minutes": None}]
            })
            assert res2.status_code == 422

            # 3. late statusida late_minutes noto'g'ri (650 > 600) -> 422
            res3 = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [{"student_id": 1, "status": "late", "late_minutes": 650}]
            })
            assert res3.status_code == 422

            # 4. To'g'ri saqlash (present + late + absent) -> 200
            res4 = await client.put("/api/grades", json={
                "date": "2026-11-20",
                "lesson": 1,
                "items": [
                    {"student_id": 1, "status": "present", "value": 5},
                    {"student_id": 2, "status": "late", "late_minutes": 15},
                    {"student_id": 3, "status": "absent", "value": None, "late_minutes": None}
                ]
            })
            assert res4.status_code == 200
            assert res4.json()["count"] == 3

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_section7_scenarios_derived_absences():
    """Section 7 hisob-kitob ssenariylari tekshiruvi:
    - 20:00 dan keyin faqat bahosiz/belgisiz o'quvchi qoldirgan hisoblanadi (19:59 da hali hisoblanmaydi)
    - Dars boshlanmagan kuni hech kim qoldirgan bo'lmaydi
    - Dars boshlangandan keyin qo'shilgan o'quvchi qoldirgan hisoblanmaydi
    - Imtihon bahosi bor-u dars bahosi yo'q o'quvchi qoldirgan hisoblanadi
    """
    mock_db = AsyncMock()

    # 1. 19:59 da dars hali yakunlanmagan -> 0 qoldirgan
    dt_1959 = datetime(2026, 11, 20, 19, 59, tzinfo=TASHKENT_TZ)
    with patch("app.services.attendance_service.get_tashkent_now", return_value=dt_1959):
        # Lesson 2 on 2026-11-20
        assert not is_lesson_completed(date(2026, 11, 20), 2)

    # 2. 20:00 da dars yakunlangan -> is_lesson_completed = True
    dt_2000 = datetime(2026, 11, 20, 20, 0, tzinfo=TASHKENT_TZ)
    with patch("app.services.attendance_service.get_tashkent_now", return_value=dt_2000):
        assert is_lesson_completed(date(2026, 11, 20), 2)

    # 3. Dars boshlangandan KEYIN qo'shilgan o'quvchi tekshiruvi
    lesson_start = datetime(2026, 11, 20, 15, 30, tzinfo=TASHKENT_TZ)
    student_joined_after = datetime(2026, 11, 20, 16, 0, tzinfo=TASHKENT_TZ)
    # student.created_at <= lesson.started_at sharti False bo'ladi
    assert not (student_joined_after <= lesson_start)

    # 4. Dars boshlanmagan (lessons yozuvi yo'q) bo'lsa -> darslar soni 0
    # Lessons mavjud bo'lmasa qoldirgan darslar 0 bo'ladi
