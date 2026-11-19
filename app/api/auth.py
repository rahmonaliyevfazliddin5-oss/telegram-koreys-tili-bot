import hmac
import hashlib
import json
import time
from urllib.parse import parse_qsl
from fastapi import HTTPException, status


def validate_init_data(init_data: str, bot_token: str) -> dict:
    if not init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiya ma'lumotlari mavjud emas"
        )

    try:
        parsed_data = dict(parse_qsl(init_data, keep_blank_values=True))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yaroqsiz ma'lumot formati"
        )

    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tekshiruv xeshi topilmadi"
        )

    # Telegram HMAC-SHA256 tekshiruvi:
    # 1. Barcha parametrlar alifbo tartibida key=value\n tarzida yig'iladi
    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(parsed_data.items())
    )

    # 2. Maxfiy kalit: WebAppData konstantasi va bot tokeni xeshi
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode("utf-8"),
        digestmod=hashlib.sha256
    ).digest()

    # 3. Hisoblangan xeshni vaqt-xavfsiz (constant-time) solishtirish
    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram imzosini tekshirish muvaffaqiyatsiz tugadi"
        )

    # 4. auth_date 24 soatdan (86400 soniya) eski bo'lmasligi kerak
    auth_date_str = parsed_data.get("auth_date")
    if not auth_date_str or not auth_date_str.isdigit():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiya sanasi topilmadi"
        )

    auth_date = int(auth_date_str)
    current_timestamp = int(time.time())
    if current_timestamp - auth_date > 86400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentifikatsiya muddati tugagan (24 soatdan ortiq)"
        )

    # 5. user ma'lumotlarini JSON dan o'qish
    user_json = parsed_data.get("user")
    if not user_json:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi ma'lumoti topilmadi"
        )

    try:
        user_data = json.loads(user_json)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi JSON ma'lumotini o'qib bo'lmadi"
        )

    user_id = user_data.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram foydalanuvchi ID raqami mavjud emas"
        )

    return {
        "user_id": int(user_id),
        "first_name": user_data.get("first_name", ""),
        "last_name": user_data.get("last_name", ""),
        "username": user_data.get("username", "")
    }
