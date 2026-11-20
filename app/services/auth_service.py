import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.admin_settings import AdminSettings

DEFAULT_ADMIN_PASSWORD = "0727"


def hash_password(password: str) -> str:
    """Parolni SHA256 xeshlaydi."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Ochiq parolni xesh bilan taqqoslaydi."""
    candidate_hash = hash_password(plain_password)
    return hmac.compare_digest(candidate_hash, hashed_password)


async def get_admin_password_hash(session: AsyncSession) -> str:
    """
    admin_settings jadvalidan admin paroli xeshini oladi.
    Agar mavjud bo'lmasa, dastlabki '0727' paroli bilan yaratadi.
    """
    stmt = select(AdminSettings).where(AdminSettings.id == 1)
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()

    if setting is not None:
        return setting.password_hash

    # Dastlabki parolni bazaga yozish
    initial_pass = getattr(settings, "ADMIN_CODE", DEFAULT_ADMIN_PASSWORD) or DEFAULT_ADMIN_PASSWORD
    initial_hash = hash_password(initial_pass)
    new_setting = AdminSettings(
        id=1,
        password_hash=initial_hash,
        updated_at=datetime.now(timezone.utc)
    )
    session.add(new_setting)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
    return initial_hash


async def verify_admin_password(session: AsyncSession, plain_password: str) -> bool:
    """Kiritilgan parolni admin paroli bilan solishtiradi."""
    db_hash = await get_admin_password_hash(session)
    if verify_password(plain_password, db_hash):
        return True

    # Zaxira sifatida settings.ADMIN_CODE yoki 0727 ni ham tekshirish
    if plain_password in (DEFAULT_ADMIN_PASSWORD, getattr(settings, "ADMIN_CODE", None)):
        return True

    return False


async def update_admin_password(session: AsyncSession, new_password: str) -> None:
    """Admin parolini yangilaydi."""
    new_hash = hash_password(new_password)
    stmt = select(AdminSettings).where(AdminSettings.id == 1)
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()

    if setting:
        setting.password_hash = new_hash
        setting.updated_at = datetime.now(timezone.utc)
    else:
        setting = AdminSettings(
            id=1,
            password_hash=new_hash,
            updated_at=datetime.now(timezone.utc)
        )
        session.add(setting)

    await session.commit()
