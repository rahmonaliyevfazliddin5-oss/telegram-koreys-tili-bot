import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os
from unittest.mock import AsyncMock, MagicMock
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.api.deps import get_current_admin
from app.database import get_db
from app.redis import get_redis


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert "Content-Security-Policy" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"


@pytest.mark.asyncio
async def test_static_files_served():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_index = await client.get("/app/")
        assert res_index.status_code == 200
        assert "<title>Admin Mini App</title>" in res_index.text

        res_css = await client.get("/app/style.css")
        assert res_css.status_code == 200
        assert "--tg-theme-bg-color" in res_css.text

        res_js = await client.get("/app/app.js")
        assert res_js.status_code == 200
        assert "Telegram?.WebApp" in res_js.text


@pytest.mark.asyncio
async def test_unauthorized_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in ["/api/students", "/api/attendance?date=2026-11-19", "/api/grades?date=2026-11-19", "/api/sources"]:
            res = await client.get(path)
            assert res.status_code == 401
            assert "detail" in res.json()


@pytest.mark.asyncio
async def test_api_crud_with_mocked_admin():
    async def mock_admin():
        return {"user_id": 12345, "first_name": "Admin"}

    app.dependency_overrides[get_current_admin] = mock_admin

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Test validation errors (e.g. invalid grade value)
            bad_grade_res = await client.post("/api/grades", json={"student_id": 1, "date": "2026-11-19", "value": 10})
            assert bad_grade_res.status_code == 422  # pydantic ge=1, le=5 validation error

            # Test invalid source lang
            bad_source_res = await client.post("/api/sources", json={"title": "Test", "text": "Content", "source_lang": "fr"})
            assert bad_source_res.status_code == 422  # pattern ^(uz|en|ru)$ validation error

            # Test invalid student payload (empty first_name)
            bad_student_res = await client.post("/api/students", json={"first_name": "", "last_name": "Test", "grade": "10-A"})
            assert bad_student_res.status_code == 422
    finally:
        app.dependency_overrides.clear()
