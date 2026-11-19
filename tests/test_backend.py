import asyncio
import hashlib
import hmac
import json
import os
import sys
import time
from urllib.parse import urlencode

import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.auth import validate_init_data
from app.services.cache_service import invalidate_rating_cache, invalidate_sources_cache
from app.services.translator import translate_text
from app.schemas.student import StudentCreate, StudentResponse
from app.api.routers.admin_auth import admin_logout


BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"


def create_init_data(user_id=12345, auth_date=None, bot_token=BOT_TOKEN):
    if auth_date is None:
        auth_date = int(time.time())
    user_json = json.dumps(
        {"id": user_id, "first_name": "Test", "last_name": "Admin", "username": "admin"},
        separators=(",", ":")
    )
    params = {
        "auth_date": str(auth_date),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": user_json
    }
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    params["hash"] = hmac.new(secret_key, data_check.encode("utf-8"), hashlib.sha256).hexdigest()
    return urlencode(params)


def test_validate_init_data_success():
    init_data = create_init_data(12345)
    res = validate_init_data(init_data, BOT_TOKEN)
    assert res["user_id"] == 12345
    assert res["first_name"] == "Test"
    assert res["last_name"] == "Admin"


def test_validate_init_data_expired():
    expired_date = int(time.time()) - 90000
    init_data = create_init_data(12345, auth_date=expired_date)
    with pytest.raises(HTTPException) as exc:
        validate_init_data(init_data, BOT_TOKEN)
    assert exc.value.status_code == 401
    assert "muddati tugagan" in exc.value.detail


def test_validate_init_data_future():
    future_date = int(time.time()) + 600
    init_data = create_init_data(12345, auth_date=future_date)
    with pytest.raises(HTTPException) as exc:
        validate_init_data(init_data, BOT_TOKEN)
    assert exc.value.status_code == 401
    assert "yaroqsiz" in exc.value.detail


def test_validate_init_data_invalid_hash():
    init_data = create_init_data(12345) + "tampered"
    with pytest.raises(HTTPException) as exc:
        validate_init_data(init_data, BOT_TOKEN)
    assert exc.value.status_code == 401


def test_validate_init_data_missing_data():
    with pytest.raises(HTTPException) as exc:
        validate_init_data("", BOT_TOKEN)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_cache_invalidation():
    with patch("app.services.cache_service.redis_client.delete", new_callable=AsyncMock) as mock_del:
        await invalidate_rating_cache()
        mock_del.assert_called_once_with("rating_cache")

    with patch("app.services.cache_service.redis_client.delete", new_callable=AsyncMock) as mock_del:
        await invalidate_sources_cache()
        mock_del.assert_called_once_with("sources_cache:uz", "sources_cache:en", "sources_cache:ru")


@pytest.mark.asyncio
async def test_translator_edge_cases():
    assert await translate_text("", "uz", "en") == ""
    assert await translate_text("Salom", "uz", "uz") == "Salom"
    assert await translate_text("   ", "uz", "en") == "   "


def test_student_schema_nullable():
    s1 = StudentCreate(first_name="Muxammadsodiq", last_name="", grade=None)
    assert s1.first_name == "Muxammadsodiq"
    assert s1.last_name == ""
    assert s1.grade is None

    s2 = StudentCreate(first_name="Ali", last_name="Valiyev")
    assert s2.grade is None


def test_students_seed_json_integrity():
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "students_seed.json")
    assert os.path.exists(json_path)
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert len(data) == 46
    for item in data:
        assert set(item.keys()) == {"last_name", "first_name"}
        assert "grade" not in item
        assert "phone" not in item

    mux = next(d for d in data if d["first_name"] == "Muxammadsodiq")
    assert mux["last_name"] == ""

    yoldash = next(d for d in data if "Yo‘ldashev" in d["last_name"])
    assert "‘" in yoldash["last_name"]


@pytest.mark.asyncio
async def test_admin_logout_endpoint():
    mock_redis = AsyncMock()
    mock_redis.get.return_value = "uz"

    with patch("app.api.routers.admin_auth.bot.send_message", new_callable=AsyncMock) as mock_send, \
         patch("app.api.routers.admin_auth.get_active_sources", new_callable=AsyncMock) as mock_sources:
        mock_sources.return_value = [{"id": 1, "title": "Dars jadvali"}]
        res = await admin_logout(admin={"user_id": 99999}, redis=mock_redis)
        assert res == {"ok": True}
        mock_redis.delete.assert_called_once_with("admin_session:99999")
        mock_send.assert_called_once()
        assert mock_send.call_args[1]["chat_id"] == 99999


def test_zero_emojis_in_app():
    def is_emoji(char):
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

    app_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")
    emojis_found = []
    for root, _, files in os.walk(app_dir):
        for f in files:
            if f.endswith(".py"):
                path = os.path.join(root, f)
                with open(path, "r", encoding="utf-8", errors="ignore") as file:
                    for line_idx, line in enumerate(file, 1):
                        for char in line:
                            if is_emoji(char):
                                emojis_found.append((path, line_idx, char))
    assert len(emojis_found) == 0, f"Emojis found: {emojis_found}"
