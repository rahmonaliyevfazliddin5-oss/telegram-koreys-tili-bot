import os
import sys
import re
import pytest
from datetime import date, time, datetime
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.services.time_service import is_weekend, is_lesson_window_open, get_tashkent_now, TASHKENT_TZ
from app.models.lesson import Lesson
from app.models.exam import Exam, ExamGrade
from app.models.attendance import AttendanceMark
from app.models.grade import Grade
from app.models.fine_ledger import FineLedger
from app.models.student import Student
from app.schemas.attendance import format_late_display
from app.i18n.texts import get_text


def is_emoji(char: str) -> bool:
    code = ord(char)
    return (
        0x1F600 <= code <= 0x1F64F or
        0x1F300 <= code <= 0x1F5FF or
        0x1F680 <= code <= 0x1F6FF or
        0x1F1E0 <= code <= 0x1F1FF or
        0x2600 <= code <= 0x26FF or
        0x2700 <= code <= 0x27BF or
        0xFE00 <= code <= 0xFE0F or
        0x1F900 <= code <= 0x1F9FF or
        0x1FA70 <= code <= 0x1FAFF or
        0x200D == code
    )


def test_checklist_zero_emojis_entire_codebase():
    """Butun loyihadagi barcha .py, .html, .css, .js fayllarida 0 emoji talabini tekshirish."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dirs = ["app", "tests"]
    scanned_files = 0

    for t_dir in target_dirs:
        for root, _, files in os.walk(os.path.join(base_dir, t_dir)):
            for file in files:
                if file.endswith((".py", ".html", ".css", ".js", ".json")):
                    scanned_files += 1
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        for line_idx, line in enumerate(f, 1):
                            for char in line:
                                assert not is_emoji(char), f"Emoji topildi {file}:{line_idx}: {char}"

    assert scanned_files > 15, "Yetarli fayllar tekshirilmadi"


def test_checklist_late_display_formatting():
    """Kech qolish vaqti formatlarini tekshirish (<60m: +15 daqiqa kech qoldi, >=60m: +1 soat 30 daqiqa kech qoldi)."""
    assert format_late_display(15) == "+15 daqiqa kech qoldi"
    assert format_late_display(59) == "+59 daqiqa kech qoldi"
    assert format_late_display(60) == "+1 soat kech qoldi"
    assert format_late_display(90) == "+1 soat 30 daqiqa kech qoldi"
    assert format_late_display(125) == "+2 soat 5 daqiqa kech qoldi"
    assert format_late_display(None) is None


@pytest.mark.asyncio
async def test_checklist_topic_gated_attendance_and_grades():
    """Dars mavzusi kiritilmagan bo'lsa, davomat va baholash 409 Conflict 'Avval dars mavzusini kiriting' qaytarishi."""
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    try:
        fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=TASHKENT_TZ)
        with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now), \
             patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now):

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                att_res = await client.put("/api/attendance", json={
                    "date": "2026-11-20",
                    "lesson": 1,
                    "absent_ids": [],
                    "late": []
                })
                assert att_res.status_code == 409
                assert "Avval dars mavzusini kiriting" in att_res.json()["detail"]

                grade_res = await client.put("/api/grades", json={
                    "date": "2026-11-20",
                    "lesson": 1,
                    "kind": "daily",
                    "items": [{"student_id": 1, "value": 5}]
                })
                assert grade_res.status_code == 409
                assert "Avval dars mavzusini kiriting" in grade_res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_checklist_exam_modifier_validation_and_rating():
    """Imtihon bahosida modifier bo'sh bo'lganda value bo'lishi shartligi (value=None, modifier='plus' -> 422)."""
    mock_db = AsyncMock()
    mock_exam = Exam(id=10, date=date(2026, 11, 20), lesson_no=1, name="Oraliq nazorat", topic="Mavzu", created_at=datetime.now())
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_exam
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            bad_res = await client.put("/api/exams/10/grades", json={
                "items": [{"student_id": 1, "value": None, "modifier": "plus"}]
            })
            assert bad_res.status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_checklist_teacher_profile_monday_to_friday_only():
    """O'qituvchi profilida dam olish kunlari (Shanba va Yakshanba) mutlaqo chiqarilmasligini tekshirish."""
    mock_db = AsyncMock()

    def mock_execute(stmt):
        m_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "count(lessons.id)" in stmt_str:
            m_res.scalar_one.return_value = 10
        elif "count(exams.id)" in stmt_str:
            m_res.scalar_one.return_value = 3
        else:
            m_res.scalars.return_value.all.return_value = []
        return m_res

    mock_db.execute.side_effect = mock_execute

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/teacher/profile?month=2026-11")
            assert res.status_code == 200
            data = res.json()

            workdays = data["workdays"]
            assert len(workdays) > 0
            for wd in workdays:
                dt = date.fromisoformat(wd["date"])
                assert dt.weekday() < 5, f"Dam olish kuni ish kunlariga qo'shilib qolgan: {dt}"
    finally:
        app.dependency_overrides.clear()
