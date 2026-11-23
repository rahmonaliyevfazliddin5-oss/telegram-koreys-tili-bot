import os
import sys
import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.i18n.texts import TEXTS, get_text
from app.models.lesson import Lesson
from app.models.student import Student
from app.models.grade import Grade
from app.bot.keyboards.admin_kb import (
    get_admin_webapp_keyboard,
    get_admin_exit_reply_keyboard
)
from app.bot.keyboards.user_kb import (
    get_language_keyboard,
    get_main_menu_keyboard,
    get_students_pagination_keyboard,
    get_rating_pagination_keyboard
)
from app.bot.handlers.admin import (
    admin_start,
    admin_check_code,
    admin_logout_handler,
    admin_logout_callback,
    AdminState,
    GLOBAL_BLOCK_KEY,
    GLOBAL_FAIL_KEY,
    get_menu_header
)
from app.bot.handlers.user import (
    user_start,
    process_language_choice,
    show_rating,
    show_students,
    process_students_page,
    show_attendance,
    show_teacher_info,
    show_contact,
    format_main_menu_text
)
from app.services.auth_service import hash_password


def is_emoji_char(char: str) -> bool:
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


def test_zero_emojis_in_i18n_and_bot():
    """Barcha bot matnlari va fayllarida nolinchi emoji talabini tekshirish."""
    for key, val in TEXTS.items():
        if isinstance(val, dict):
            for lang, txt in val.items():
                for char in txt:
                    assert not is_emoji_char(char), f"Emoji topildi TEXTS[{key}][{lang}]: {char}"
        elif isinstance(val, str):
            for char in val:
                assert not is_emoji_char(char), f"Emoji topildi TEXTS[{key}]: {char}"

    bot_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "bot")
    for root, _, files in os.walk(bot_dir):
        for f in files:
            if f.endswith(".py"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8") as file:
                    for line_idx, line in enumerate(file, 1):
                        for char in line:
                            assert not is_emoji_char(char), f"Emoji topildi {path}:{line_idx}: {char}"


def test_i18n_get_text():
    assert get_text("rating_btn", "uz") == "Reyting"
    assert get_text("rating_btn", "en") == "Rating"
    assert get_text("rating_btn", "ru") == "Рейтинг"
    assert "Top-3" in get_text("rating_title", "uz")
    assert "+998901644566" in get_text("contact_details", "uz")
    assert "30 daqiqaga" in get_text("admin_blocked_alert", "uz")


def test_admin_keyboards():
    webapp_kb = get_admin_webapp_keyboard("uz")
    assert len(webapp_kb.inline_keyboard) == 1
    btn = webapp_kb.inline_keyboard[0][0]
    assert btn.text == "Mini App"
    assert btn.web_app is not None

    exit_kb = get_admin_exit_reply_keyboard("uz")
    assert exit_kb.is_persistent is True
    assert exit_kb.resize_keyboard is True
    assert exit_kb.keyboard[0][0].text == "Admindan chiqish"


def test_user_keyboards():
    lang_kb = get_language_keyboard()
    callbacks = [row[0].callback_data for row in lang_kb.inline_keyboard]
    assert callbacks == ["lang:uz", "lang:en", "lang:ru"]

    main_kb = get_main_menu_keyboard("uz", ["Qo'shimcha"])
    texts = [btn.text for row in main_kb.keyboard for btn in row]
    assert "Reyting" in texts
    assert "O'quvchilar" in texts
    assert "Davomat" in texts
    assert "O'qituvchi haqida" in texts
    assert "Bog'lanish" in texts
    assert "Qo'shimcha" in texts

    std_kb = get_students_pagination_keyboard(current_page=2, total_pages=5)
    assert len(std_kb.inline_keyboard[0]) == 2
    assert std_kb.inline_keyboard[0][0].callback_data == "std_page:1"
    assert std_kb.inline_keyboard[0][1].callback_data == "std_page:3"


@pytest.mark.asyncio
async def test_admin_start_when_blocked():
    message = AsyncMock()
    message.from_user.id = 12345
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl:
        mock_ttl.return_value = 1750  # ~30 daqiqa qolgan
        await admin_start(message, state, lang="uz")

        message.answer.assert_called_once()
        sent_text = message.answer.call_args[0][0]
        assert "Tizim global bloklangan" in sent_text
        assert "30 daqiqa" in sent_text
        state.set_state.assert_not_called()


@pytest.mark.asyncio
async def test_admin_start_when_session_active():
    message = AsyncMock()
    message.from_user.id = 12345
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl, \
         patch("app.bot.handlers.admin.redis_client.get", new_callable=AsyncMock) as mock_get:
        mock_ttl.return_value = -2  # Bloklanmagan
        mock_get.return_value = "1"  # Sessiya faol

        await admin_start(message, state, lang="uz")

        state.clear.assert_called_once()
        assert message.answer.call_count == 2
        # Birinchi xabarda Admindan chiqish persistent keyboard
        # Ikkinchi xabarda Mini App inline WebApp
        reply_markups = [call[1].get("reply_markup") for call in message.answer.call_args_list]
        assert any(getattr(rm, "is_persistent", False) is True for rm in reply_markups if rm)
        assert any(getattr(rm, "inline_keyboard", None) is not None for rm in reply_markups if rm)


@pytest.mark.asyncio
async def test_admin_start_prompt_code():
    message = AsyncMock()
    message.from_user.id = 12345
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl, \
         patch("app.bot.handlers.admin.redis_client.get", new_callable=AsyncMock) as mock_get:
        mock_ttl.return_value = -2
        mock_get.return_value = None

        await admin_start(message, state, lang="uz")

        state.set_state.assert_called_once_with(AdminState.waiting_for_code)
        message.answer.assert_called_once_with("Kodni kiriting:")


@pytest.mark.asyncio
async def test_admin_check_code_success_default_07070707():
    message = AsyncMock()
    message.from_user.id = 55555
    message.text = "07070707"
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl, \
         patch("app.bot.handlers.admin.redis_client.delete", new_callable=AsyncMock) as mock_del, \
         patch("app.bot.handlers.admin.redis_client.set", new_callable=AsyncMock) as mock_set, \
         patch("app.bot.handlers.admin.verify_admin_password", new_callable=AsyncMock) as mock_verify:
        mock_ttl.return_value = -2
        mock_verify.return_value = True

        await admin_check_code(message, state, lang="uz")

        state.clear.assert_called_once()
        mock_del.assert_called_once_with(GLOBAL_FAIL_KEY)
        mock_set.assert_called_once_with("admin_session:55555", "1", ex=43200)

        assert message.answer.call_count == 2
        texts = [call[0][0] for call in message.answer.call_args_list]
        assert "Siz admin panelga kirdingiz" in texts


@pytest.mark.asyncio
async def test_admin_check_code_wrong_under_3():
    message = AsyncMock()
    message.from_user.id = 55555
    message.text = "wrong_code"
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl, \
         patch("app.bot.handlers.admin.redis_client.incr", new_callable=AsyncMock) as mock_incr, \
         patch("app.bot.handlers.admin.redis_client.expire", new_callable=AsyncMock) as mock_exp, \
         patch("app.bot.handlers.admin.verify_admin_password", new_callable=AsyncMock) as mock_verify:
        mock_ttl.return_value = -2
        mock_verify.return_value = False
        mock_incr.return_value = 1

        await admin_check_code(message, state, lang="uz")

        mock_exp.assert_called_once_with(GLOBAL_FAIL_KEY, 3600)
        message.answer.assert_called_once()
        assert "Qolgan urinishlar: 2" in message.answer.call_args[0][0]


@pytest.mark.asyncio
async def test_admin_check_code_3rd_wrong_triggers_global_block_and_wipes_sessions():
    message = AsyncMock()
    message.from_user.id = 55555
    message.text = "wrong_code"
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.ttl", new_callable=AsyncMock) as mock_ttl, \
         patch("app.bot.handlers.admin.redis_client.incr", new_callable=AsyncMock) as mock_incr, \
         patch("app.bot.handlers.admin.redis_client.set", new_callable=AsyncMock) as mock_set, \
         patch("app.bot.handlers.admin.redis_client.delete", new_callable=AsyncMock) as mock_del, \
         patch("app.bot.handlers.admin.redis_client.keys", new_callable=AsyncMock) as mock_keys, \
         patch("app.bot.handlers.admin.verify_admin_password", new_callable=AsyncMock) as mock_verify:
        mock_ttl.return_value = -2
        mock_verify.return_value = False
        mock_incr.return_value = 3
        mock_keys.return_value = ["admin_session:1", "admin_session:2"]

        await admin_check_code(message, state, lang="uz")

        # 30 daqiqaga global blok
        mock_set.assert_called_once_with(GLOBAL_BLOCK_KEY, "1", ex=1800)
        # admin_fail_global o'chiriladi
        mock_del.assert_any_call(GLOBAL_FAIL_KEY)
        # Barcha admin_session:* o'chiriladi
        mock_del.assert_any_call("admin_session:1", "admin_session:2")
        state.clear.assert_called_once()
        assert "30 daqiqaga global bloklandi" in message.answer.call_args[0][0]


@pytest.mark.asyncio
async def test_admin_logout_removes_session_and_keyboard():
    message = AsyncMock()
    message.from_user.id = 77777
    state = AsyncMock()

    with patch("app.bot.handlers.admin.redis_client.delete", new_callable=AsyncMock) as mock_del, \
         patch("app.bot.handlers.user.get_active_sources", new_callable=AsyncMock) as mock_sources:
        mock_sources.return_value = []
        await admin_logout_handler(message, state, lang="uz")

        mock_del.assert_called_once_with("admin_session:77777")
        state.clear.assert_called_once()
        assert message.answer.call_count == 2
        # Birinchi xabar: ReplyKeyboardRemove bilan "Siz admin paneldan chiqdingiz"
        assert message.answer.call_args_list[0][0][0] == "Siz admin paneldan chiqdingiz"
        # Ikkinchi xabar: Oddiy foydalanuvchi menyusi
        assert "Asosiy menyu:" in message.answer.call_args_list[1][0][0]


@pytest.mark.asyncio
async def test_user_start_new_and_existing():
    message = AsyncMock()

    # Yangi foydalanuvchi (lang=None)
    await user_start(message, lang=None)
    message.answer.assert_called_once()
    assert message.answer.call_args[0][0] == "Tilni tanlang:"

    # Mavjud foydalanuvchi (lang="uz")
    message.reset_mock()
    with patch("app.bot.handlers.user.get_active_sources", new_callable=AsyncMock) as mock_sources:
        mock_sources.return_value = []
        await user_start(message, lang="uz")
        message.answer.assert_called_once()
        assert "Bugungi sana:" in message.answer.call_args[0][0]
        assert "Asosiy menyu:" in message.answer.call_args[0][0]


@pytest.mark.asyncio
async def test_user_rating_top3_filter_and_note():
    message = AsyncMock()

    rating_data = [
        {"rank": 1, "first_name": "Aziz", "last_name": "Karimov", "total_score": 100},
        {"rank": 2, "first_name": "Bekzod", "last_name": "Aliyev", "total_score": 85},
        {"rank": 3, "first_name": "Diyor", "last_name": "Valiyev", "total_score": 70},
        {"rank": 4, "first_name": "Eldor", "last_name": "Sobirov", "total_score": 50},
        {"rank": 5, "first_name": "Farrux", "last_name": "Zokirov", "total_score": 0},
    ]

    with patch("app.bot.handlers.user.calculate_and_cache_rating", new_callable=AsyncMock) as mock_calc:
        mock_calc.return_value = rating_data
        await show_rating(message, lang="uz")

        message.answer.assert_called_once()
        text = message.answer.call_args[0][0]
        # Faqat 1-3 o'rinlar ko'rinishi shart
        assert "1. Aziz Karimov - 100" in text
        assert "2. Bekzod Aliyev - 85" in text
        assert "3. Diyor Valiyev - 70" in text
        assert "Eldor Sobirov" not in text
        assert "Farrux Zokirov" not in text
        # Ostida izoh matni bo'lishi shart
        assert "Agarda sizning farzandingiz bu ro'yxatda bo'lmasa, o'z ustida ko'proq ishlashi lozim." in text


@pytest.mark.asyncio
async def test_user_rating_empty():
    message = AsyncMock()
    with patch("app.bot.handlers.user.calculate_and_cache_rating", new_callable=AsyncMock) as mock_calc:
        mock_calc.return_value = []
        await show_rating(message, lang="uz")

        message.answer.assert_called_once()
        assert "Reyting mavjud emas" in message.answer.call_args[0][0]


@pytest.mark.asyncio
async def test_user_students_list_and_absences():
    message = AsyncMock()

    mock_students = [
        {"id": 1, "first_name": "Ali", "last_name": "Valiyev", "grade": "10-A", "absences_count": 3},
        {"id": 2, "first_name": "Vali", "last_name": "Aliyev", "grade": "10-B", "absences_count": 0},
    ]

    with patch("app.bot.handlers.user.fetch_students_with_absences", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_students
        await show_students(message, lang="uz")

        message.answer.assert_called_once()
        text = message.answer.call_args[0][0]
        assert "1. Ali Valiyev - 3 marta dars qoldirgan" in text
        assert "2. Vali Aliyev - 0 marta dars qoldirgan" in text


@pytest.mark.asyncio
async def test_user_attendance_lessons():
    message = AsyncMock()

    mock_session = AsyncMock()
    mock_res_lessons = MagicMock()
    mock_res_lessons.scalars.return_value.all.return_value = [
        Lesson(id=1, date=date(2026, 11, 20), lesson_no=1, topic="1-dars", started_at=datetime(2026, 11, 20, 7, 0)),
        Lesson(id=2, date=date(2026, 11, 20), lesson_no=2, topic="2-dars", started_at=datetime(2026, 11, 20, 15, 45))
    ]

    mock_res_students = MagicMock()
    mock_res_students.scalars.return_value.all.return_value = [
        Student(id=1, first_name="Sardor", last_name="Qodirov", created_at=datetime(2026, 11, 20, 6, 0)),
        Student(id=2, first_name="Jasur", last_name="Nematov", created_at=datetime(2026, 11, 20, 6, 0))
    ]

    mock_res_grades = MagicMock()
    mock_res_grades.scalars.return_value.all.return_value = [
        Grade(student_id=2, date=date(2026, 11, 20), lesson_no=1, value=5),
        Grade(student_id=1, date=date(2026, 11, 20), lesson_no=2, value=5)
    ]

    mock_res_empty = MagicMock()
    mock_res_empty.all.return_value = []
    mock_res_empty.scalars.return_value.all.return_value = []

    def mock_execute(stmt):
        stmt_str = str(stmt).lower()
        if "from lessons" in stmt_str:
            return mock_res_lessons
        elif "from students" in stmt_str:
            return mock_res_students
        elif "from grades" in stmt_str:
            return mock_res_grades
        else:
            return mock_res_empty

    mock_session.execute.side_effect = mock_execute
    mock_session_maker = MagicMock()
    mock_session_maker.return_value.__aenter__.return_value = mock_session

    with patch("app.bot.handlers.user.async_session_maker", mock_session_maker), \
         patch("app.bot.handlers.user.get_tashkent_now") as mock_now, \
         patch("app.bot.handlers.user.is_weekend", return_value=False):
        mock_now.return_value = datetime(2026, 11, 20, 21, 0, tzinfo=ZoneInfo("Asia/Tashkent"))

        await show_attendance(message, lang="uz")

        message.answer.assert_called_once()
        text = message.answer.call_args[0][0]
        assert "Bugungi davomat (2026-11-20):" in text
        assert "1-dars (07:00):" in text
        assert "- Sardor Qodirov" in text
        assert "2-dars (15:45):" in text
        assert "- Jasur Nematov" in text


@pytest.mark.asyncio
async def test_user_teacher_info():
    message = AsyncMock()
    await show_teacher_info(message, lang="uz")
    message.answer.assert_called_once()
    assert "O'qituvchi haqida ma'lumot" in message.answer.call_args[0][0]
    assert "TOPIK II" in message.answer.call_args[0][0]
    assert "titki, ilki, sigi, maragi" in message.answer.call_args[0][0]
    assert "Sohibqiron 245" in message.answer.call_args[0][0]


@pytest.mark.asyncio
async def test_user_contact():
    message = AsyncMock()
    await show_contact(message, lang="uz")
    message.answer_contact.assert_called_once_with(
        phone_number="+998901644566",
        first_name="Koreys tili",
        last_name="O'qituvchi"
    )
    message.answer.assert_called_once()
    assert "+998901644566" in message.answer.call_args[0][0]
    assert "Sohibqiron 245" in message.answer.call_args[0][0]
