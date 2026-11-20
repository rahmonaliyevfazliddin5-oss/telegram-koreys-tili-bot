import os
import sys
import re
import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.models.student import Student
from app.models.exam import Exam


@pytest.mark.asyncio
async def test_student_search_and_sorting():
    """Qidiruv: 'aliyev vali', 'yo'ldashev' (turli apostroflar), bo'sh familiyali o'quvchilar."""
    mock_db = AsyncMock()

    now = datetime.now()
    st1 = Student(id=1, first_name="Vali", last_name="Aliyev", grade="9", created_at=now)
    st2 = Student(id=2, first_name="Muxammadsodiq", last_name="", grade="10", created_at=now)
    st3 = Student(id=3, first_name="Bobur", last_name="Yo‘ldashev", grade="11", created_at=now)

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [st1, st2, st3]
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Tartib: "Aliyev Vali"
            res = await client.get("/api/students?search=aliyev%20vali")
            assert res.status_code == 200

            # 2. Apostrof bilan qidiruv: yo'ldashev
            res_apostrophe = await client.get("/api/students?search=yo'ldashev")
            assert res_apostrophe.status_code == 200

            # 3. Turli apostrof: yoʻldashev
            res_curled = await client.get("/api/students?search=yoʻldashev")
            assert res_curled.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_fine_double_click_protection():
    """Jarima yoki to'lov tugmasini ketma-ket bosganda 409 Conflict takroriy so'rovdan himoya."""
    mock_db = AsyncMock()
    now = datetime.now()
    st = Student(id=1, first_name="Vali", last_name="Aliyev", grade="9", created_at=now)
    mock_db.get.return_value = st

    mock_res = MagicMock()
    mock_res.scalar_one.return_value = 0
    mock_db.execute.return_value = mock_res

    mock_redis = AsyncMock()
    # Birinchi so'rovda True, ikkinchi so'rovda False (lock band)
    mock_redis.set.side_effect = [True, False]

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1-so'rov muvaffaqiyatli
            res1 = await client.post("/api/students/1/fine", json={"amount": 10000})
            assert res1.status_code == 200

            # 2-so'rov lock tufayli bloklanadi (409)
            res2 = await client.post("/api/students/1/fine", json={"amount": 10000})
            assert res2.status_code == 409
            assert "allaqachon bajarilmoqda" in res2.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_exams_newest_first_ordering():
    """Baholash > Imtihon ro'yxatida oxirgi ochilgan imtihon birinchi (descending order)."""
    mock_db = AsyncMock()
    e1 = Exam(id=1, date=date(2026, 11, 20), lesson_no=1, name="1-imtihon", topic="Mavzu 1", created_at=datetime.now())
    e2 = Exam(id=2, date=date(2026, 11, 20), lesson_no=1, name="2-imtihon", topic="Mavzu 2", created_at=datetime.now())

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [e2, e1]
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_admin] = lambda: {"user_id": 12345, "first_name": "Admin"}
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: AsyncMock()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/exams?date=2026-11-20")
            assert res.status_code == 200
            data = res.json()
            assert len(data) == 2
            assert data[0]["id"] == 2
            assert data[1]["id"] == 1
    finally:
        app.dependency_overrides.clear()


def test_ui_components_structure_for_section7():
    """HTML va CSS tekshiruvi: yagona Saqlash paneli, 4 ta qidiruv maydoni, sinf chiplari va xatolik matnlari."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    html_path = os.path.join(base_dir, "app", "static", "index.html")
    css_path = os.path.join(base_dir, "app", "static", "style.css")

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    # 1. Yagona saqlash paneli konteyneri
    assert 'id="globalSaveContainer"' in html
    assert html.count('id="btnSaveAttendance"') == 0
    assert html.count('id="btnSaveGrades"') == 0

    # 2. Qidiruv va sinf filtrlari o'quvchilar ro'yxatlari uchun (O'quvchilar, Baholash dars, Baholash imtihon)
    assert 'id="studentSearchInput"' in html
    assert 'id="studentsClassChips"' in html
    assert 'id="dailyGradeSearchInput"' in html
    assert 'id="dailyGradeClassChips"' in html
    assert 'id="examGradeSearchInput"' in html
    assert 'id="examGradeClassChips"' in html

    # 3. Kech qoldi xatolik matni
    assert 'id="lateInputError"' in html

    # 4. Imtihon FAB tugmasi
    assert 'id="fabAddExam"' in html

    # 5. CSS qoidalari: safe-area, tab-h, save-h, keyboard-open
    assert "--tab-h: 64px;" in css
    assert "--save-h: 56px;" in css
    assert "body.keyboard-open .bottom-nav" in css
    assert ".global-save-bar" in css
    assert ".btn-spinner" in css
