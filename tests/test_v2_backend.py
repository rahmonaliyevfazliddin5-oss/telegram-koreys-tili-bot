import pytest
from datetime import datetime, date, time
import zoneinfo
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.config import settings
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis
from app.services.time_service import (
    TASHKENT_TZ,
    get_tashkent_now,
    is_weekend,
    is_lesson_window_open,
    get_lesson_window_status
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    DEFAULT_ADMIN_PASSWORD
)
from app.models.student import Student
from app.models.attendance import AttendanceSession, Absence
from app.models.grade import Grade
from app.models.fine_ledger import FineLedger
from app.models.admin_settings import AdminSettings


# ==========================================
# 1. TIME SERVICE TESTS
# ==========================================

def test_tashkent_timezone():
    now = get_tashkent_now()
    assert now.tzinfo is not None
    # UTC+5 bo'lishi kerak
    utcoffset = now.utcoffset().total_seconds()
    assert utcoffset == 5 * 3600


def test_is_weekend():
    # 2026-11-20: Juma (weekday 4) -> ish kuni
    friday = date(2026, 11, 20)
    assert is_weekend(friday) is False

    # 2026-11-21: Shanba (weekday 5) -> dam olish kuni
    saturday = date(2026, 11, 21)
    assert is_weekend(saturday) is True

    # 2026-11-22: Yakshanba (weekday 6) -> dam olish kuni
    sunday = date(2026, 11, 22)
    assert is_weekend(sunday) is True


def test_lesson_windows():
    test_date = date(2026, 11, 20)  # Ish kuni

    # Mock qilib joriy sana test_date ga teng deb olamiz
    with patch("app.services.time_service.get_tashkent_now") as mock_now:
        # 1-dars: 07:00 - 12:00
        # 06:59: yopiq
        mock_now.return_value = datetime(2026, 11, 20, 6, 59, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, test_date, time(6, 59)) is False

        # 07:00: ochiq
        mock_now.return_value = datetime(2026, 11, 20, 7, 0, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, test_date, time(7, 0)) is True

        # 10:30: ochiq
        mock_now.return_value = datetime(2026, 11, 20, 10, 30, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, test_date, time(10, 30)) is True

        # 11:59: ochiq
        mock_now.return_value = datetime(2026, 11, 20, 11, 59, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, test_date, time(11, 59)) is True

        # 12:00: yopiq (tugash kiritilmagan: 12:00:00 dan boshlab yopiq)
        mock_now.return_value = datetime(2026, 11, 20, 12, 0, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, test_date, time(12, 0)) is False

        # 2-dars: 15:30 - 20:00
        # 15:29: yopiq
        mock_now.return_value = datetime(2026, 11, 20, 15, 29, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(2, test_date, time(15, 29)) is False

        # 15:30: ochiq
        mock_now.return_value = datetime(2026, 11, 20, 15, 30, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(2, test_date, time(15, 30)) is True

        # 15:45 (dars vaqti): ochiq
        mock_now.return_value = datetime(2026, 11, 20, 15, 45, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(2, test_date, time(15, 45)) is True

        # 19:59: ochiq
        mock_now.return_value = datetime(2026, 11, 20, 19, 59, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(2, test_date, time(19, 59)) is True

        # 20:00: yopiq (20:00 dan boshlab yopiq)
        mock_now.return_value = datetime(2026, 11, 20, 20, 0, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(2, test_date, time(20, 0)) is False

        # Dam olish kunida doim yopiq
        mock_now.return_value = datetime(2026, 11, 21, 10, 0, tzinfo=TASHKENT_TZ)
        assert is_lesson_window_open(1, date(2026, 11, 21), time(10, 0)) is False


def test_get_lesson_window_status():
    dt = datetime(2026, 11, 20, 8, 30, tzinfo=TASHKENT_TZ)
    st = get_lesson_window_status(dt)
    assert st["is_weekend"] is False
    assert st["active_lesson"] == 1
    assert st["lesson1_open"] is True
    assert st["lesson2_open"] is False
    assert st["is_any_window_open"] is True
    assert st["lesson_1"]["time"] == "07:00"
    assert st["lesson_2"]["time"] == "15:45"


# ==========================================
# 2. AUTH SERVICE TESTS
# ==========================================

def test_auth_service_hashing():
    pwd = "my_secret_password_123"
    h = hash_password(pwd)
    assert len(h) == 64  # SHA-256 hexdigest
    assert verify_password(pwd, h) is True
    assert verify_password("wrong_password", h) is False


# ==========================================
# 3. API ENDPOINTS & GLOBAL BLOCK TESTS
# ==========================================

@pytest.mark.asyncio
async def test_get_status_endpoint():
    mock_redis = AsyncMock()
    mock_redis.ttl.return_value = 0
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get("/api/status")
            assert res.status_code == 200
            data = res.json()
            assert "server_time" in data
            assert "is_weekend" in data
            assert "lesson1_open" in data
            assert "lesson2_open" in data
            assert "lesson_1" in data
            assert "lesson_2" in data
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_global_block_blocks_requests():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    mock_redis = AsyncMock()
    mock_redis.get.side_effect = lambda k: "1" if k == "admin_block_global" else None
    mock_redis.ttl.return_value = 1500

    app.dependency_overrides[get_current_admin] = mock_admin
    app.dependency_overrides[get_redis] = lambda: mock_redis

    try:
        # get_current_admin ni bevosita tekshirish
        from app.api.deps import get_current_admin as real_get_current_admin
        from fastapi import Request
        from fastapi import HTTPException

        fake_req = MagicMock(spec=Request)
        fake_req.headers = {"Authorization": "tma valid"}
        with pytest.raises(HTTPException) as exc:
            await real_get_current_admin(fake_req, redis=mock_redis)
        assert exc.value.status_code == 403
        assert "global bloklangan" in exc.value.detail
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_attendance_window_closed_forbidden():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    try:
        from zoneinfo import ZoneInfo
        fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=ZoneInfo("Asia/Tashkent"))
        with patch("app.api.routers.attendance.get_tashkent_now", return_value=fake_now), \
             patch("app.api.routers.attendance.is_weekend", return_value=False), \
             patch("app.api.routers.attendance.is_lesson_window_open", return_value=False):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.put(
                    "/api/attendance",
                    json={"date": "2026-11-20", "lesson": 1, "absences": [1, 2]}
                )
                assert res.status_code == 403
                assert "yopiq" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_grades_window_closed_forbidden():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    try:
        from zoneinfo import ZoneInfo
        fake_now = datetime(2026, 11, 20, 9, 0, tzinfo=ZoneInfo("Asia/Tashkent"))
        with patch("app.api.routers.grades.get_tashkent_now", return_value=fake_now), \
             patch("app.api.routers.grades.is_weekend", return_value=False), \
             patch("app.api.routers.grades.is_lesson_window_open", return_value=False):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.put(
                    "/api/grades",
                    json={"date": "2026-11-20", "lesson": 1, "kind": "daily", "grades": [{"student_id": 1, "value": 5}]}
                )
                assert res.status_code == 403
                assert "yopiq" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


# ==========================================
# 4. STUDENT PROFILE, FINES & PAYMENTS TESTS
# ==========================================

from app.api.routers.students import get_student_debt


@pytest.mark.asyncio
async def test_get_student_debt_calculation():
    # 1. Fines: 30 000, Payments: 10 000 -> Debt: 20 000
    mock_db = AsyncMock()
    mock_res_fine = MagicMock()
    mock_res_fine.scalar_one.return_value = 30000
    mock_res_payment = MagicMock()
    mock_res_payment.scalar_one.return_value = 10000
    mock_db.execute.side_effect = [mock_res_fine, mock_res_payment]

    debt = await get_student_debt(mock_db, 1)
    assert debt == 20000

    # 2. Hech qachon manfiy bo'lmaydi: Fines: 10 000, Payments: 15 000 -> Debt: 0
    mock_res_fine.scalar_one.return_value = 10000
    mock_res_payment.scalar_one.return_value = 15000
    mock_db.execute.side_effect = [mock_res_fine, mock_res_payment]

    debt_negative = await get_student_debt(mock_db, 1)
    assert debt_negative == 0


@pytest.mark.asyncio
async def test_fine_and_collect_validation():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. Manfiy yoki 0 summa uchun 422 (pydantic gt=0)
            bad_fine = await client.post("/api/students/1/fine", json={"amount": 0})
            assert bad_fine.status_code == 422

            bad_collect = await client.post("/api/students/1/collect", json={"amount": -5000})
            assert bad_collect.status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_password_change_validation():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Parol tasdiqlash mos kelmasa 400
            mismatch_res = await client.post(
                "/api/admin/password",
                json={"old_password": "Inson.7", "new_password": "secret_pass_12", "confirm_password": "different_pass"}
            )
            assert mismatch_res.status_code == 400
            assert "mos kelmadi" in mismatch_res.json()["detail"]

            # Yangi parol 4 belgidan kalta bo'lsa 422
            short_res = await client.post(
                "/api/admin/password",
                json={"old_password": "Inson.7", "new_password": "123"}
            )
            assert short_res.status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_top3_rating_endpoints():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    sample_rating = [
        {"rank": 1, "id": 1, "first_name": "Ali", "last_name": "Valiyev", "grade": "10-A", "total_score": 25},
        {"rank": 2, "id": 2, "first_name": "Vali", "last_name": "Aliyev", "grade": "10-A", "total_score": 20},
        {"rank": 3, "id": 3, "first_name": "Gani", "last_name": "Soliyev", "grade": "10-B", "total_score": 15},
        {"rank": 4, "id": 4, "first_name": "Sobir", "last_name": "Toshov", "grade": "10-B", "total_score": 10},
        {"rank": 5, "id": 5, "first_name": "Nol", "last_name": "Ball", "grade": "10-B", "total_score": 0},
    ]

    try:
        with patch("app.services.rating_service.calculate_and_cache_rating", new_callable=AsyncMock) as mock_calc:
            mock_calc.return_value = sample_rating
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                # 1. /api/students/rating?limit=3
                res1 = await client.get("/api/students/rating?limit=3")
                assert res1.status_code == 200
                data1 = res1.json()
                assert len(data1) == 3
                assert data1[0]["rank"] == 1
                assert data1[0]["total_score"] == 25
                assert data1[2]["rank"] == 3

                # 2. /api/rating?limit=3 alias
                res2 = await client.get("/api/rating?limit=3")
                assert res2.status_code == 200
                data2 = res2.json()
                assert len(data2) == 3
                assert data2[0]["id"] == 1
    finally:
        app.dependency_overrides.clear()
