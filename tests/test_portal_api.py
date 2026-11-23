import pytest
import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import get_db
from app.redis import get_redis


@pytest.mark.asyncio
async def test_portal_endpoints_access_and_privacy():
    mock_db = AsyncMock()
    mock_redis = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_redis] = lambda: mock_redis

    sample_rating = [
        {"rank": 1, "id": 1, "first_name": "Biloliddin", "last_name": "Odiljonov", "grade": "9-sinf", "total_score": 100, "daily_score": 50, "exam_score": 50},
        {"rank": 2, "id": 2, "first_name": "Faxriddin", "last_name": "Maxmudov", "grade": "8-sinf", "total_score": 90, "daily_score": 40, "exam_score": 50},
        {"rank": 3, "id": 3, "first_name": "Dovutbek", "last_name": "Ibrohimov", "grade": "10-sinf", "total_score": 85, "daily_score": 45, "exam_score": 40},
    ]

    try:
        with patch("app.api.routers.portal.calculate_and_cache_rating", new_callable=AsyncMock) as mock_calc, \
             patch("app.api.routers.portal.finalize_pending_lessons", new_callable=AsyncMock), \
             patch("app.api.routers.portal.get_all_students_derived_attendance_stats", new_callable=AsyncMock) as mock_stats:

            mock_calc.return_value = sample_rating
            mock_stats.return_value = {1: {"absences": 1, "lates": 0}, 2: {"absences": 0, "lates": 1}}

            # Setup mock_db execute returns for attendance & students
            mock_scalar_result = MagicMock()
            mock_scalar_result.scalars.return_value.all.return_value = []
            mock_scalar_result.all.return_value = []
            mock_scalar_result.scalar_one.return_value = 10
            mock_db.execute.return_value = mock_scalar_result

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                # 1. Leaderboard (No auth required)
                res = await client.get("/api/portal/leaderboard")
                assert res.status_code == 200
                data = res.json()
                assert "students" in data
                assert len(data["students"]) == 3
                # Verify no parent phone
                for s in data["students"]:
                    assert "parent_phone" not in s
                    assert "phone" not in s

                # 2. Attendance (No auth required)
                res_att = await client.get("/api/portal/attendance")
                assert res_att.status_code == 200
                att_data = res_att.json()
                assert "lesson_1" in att_data
                assert "lesson_2" in att_data

                # 3. Students list (No auth required)
                res_std = await client.get("/api/portal/students")
                assert res_std.status_code == 200
                std_data = res_std.json()
                assert "items" in std_data

                # 4. Teacher info (No auth required)
                res_tch = await client.get("/api/portal/teacher")
                assert res_tch.status_code == 200
                tch_data = res_tch.json()
                assert "Sohibqiron 245" in tch_data["location"]
                assert "TOPIK" in tch_data["directions"]
    finally:
        app.dependency_overrides.clear()
