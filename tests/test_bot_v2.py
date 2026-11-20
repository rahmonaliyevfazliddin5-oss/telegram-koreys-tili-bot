import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.bot.handlers.user import (
    show_attendance,
    show_students,
    format_bot_late_display
)
from app.models.lesson import Lesson
from app.models.attendance import AttendanceSession, AttendanceMark
from app.models.student import Student


def test_bot_late_display_translations():
    # Uzbek
    assert format_bot_late_display(15, "uz") == "+15 daqiqa kech qoldi"
    assert format_bot_late_display(60, "uz") == "+1 soat kech qoldi"
    assert format_bot_late_display(90, "uz") == "+1 soat 30 daqiqa kech qoldi"

    # English
    assert format_bot_late_display(15, "en") == "+15 min late"
    assert format_bot_late_display(60, "en") == "+1 h late"
    assert format_bot_late_display(90, "en") == "+1 h 30 min late"

    # Russian
    assert format_bot_late_display(15, "ru") == "+15 мин опоздал(а)"
    assert format_bot_late_display(60, "ru") == "+1 ч опоздал(а)"
    assert format_bot_late_display(90, "ru") == "+1 ч 30 мин опоздал(а)"


@pytest.mark.asyncio
async def test_bot_show_attendance_with_lates_and_absents():
    message = AsyncMock()

    class MockMark:
        def __init__(self, lesson_no, status, late_minutes, first_name, last_name):
            self.lesson_no = lesson_no
            self.status = status
            self.late_minutes = late_minutes
            self.first_name = first_name
            self.last_name = last_name

    # Lesson 1: absent student and late student
    mock_marks = [
        MockMark(1, "absent", None, "Ali", "Valiyev"),
        MockMark(1, "late", 15, "Vali", "Aliyev"),
    ]

    mock_session = AsyncMock()
    mock_res_lessons = MagicMock()
    mock_res_lessons.scalars.return_value.all.return_value = [Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="Kirish")]

    mock_res_sessions = MagicMock()
    mock_res_sessions.scalars.return_value.all.return_value = [AttendanceSession(date=date(2026, 11, 20), lesson_no=1)]

    mock_res_marks = MagicMock()
    mock_res_marks.all.return_value = mock_marks

    def mock_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from lessons" in stmt_str:
            return mock_res_lessons
        elif "from attendance_sessions" in stmt_str:
            return mock_res_sessions
        else:
            return mock_res_marks

    mock_session.execute.side_effect = mock_execute
    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    fake_now = datetime(2026, 11, 20, 10, 0, tzinfo=ZoneInfo("Asia/Tashkent"))

    with patch("app.bot.handlers.user.async_session_maker", mock_session_maker), \
         patch("app.bot.handlers.user.get_tashkent_now", return_value=fake_now), \
         patch("app.bot.handlers.user.is_weekend", return_value=False):
        await show_attendance(message, lang="uz")

        message.answer.assert_called_once()
        text = message.answer.call_args[0][0]
        # 1-dars tekshiruvlari
        assert "1-dars (07:00):" in text
        assert "Kelmaganlar ro'yxati:" in text
        assert "- Ali Valiyev" in text
        assert "Kech qolganlar ro'yxati:" in text
        assert "- Vali Aliyev +15 daqiqa kech qoldi" in text
        # 2-dars boshlanmagan
        assert "2-dars (15:45):" in text
        assert "Dars boshlanmagan" in text


@pytest.mark.asyncio
async def test_bot_show_students_with_absences_and_lates():
    message = AsyncMock()

    mock_students = [
        {"id": 1, "first_name": "Ali", "last_name": "Valiyev", "grade": "10-A", "absences_count": 2, "lates_count": 1},
        {"id": 2, "first_name": "Vali", "last_name": "Aliyev", "grade": "10-B", "absences_count": 0, "lates_count": 0},
    ]

    with patch("app.bot.handlers.user.fetch_students_with_absences", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_students
        await show_students(message, lang="uz")

        message.answer.assert_called_once()
        text = message.answer.call_args[0][0]
        assert "1. Ali Valiyev - 2 marta dars qoldirgan, 1 marta kech qolgan" in text
        assert "2. Vali Aliyev - 0 marta dars qoldirgan, 0 marta kech qolgan" in text
