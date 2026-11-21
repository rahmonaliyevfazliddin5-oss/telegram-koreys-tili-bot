from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source import Source


async def get_all_sources(db: AsyncSession) -> List[Source]:
    """Barcha o'quv manbalarini tartiblangan holda olish."""
    stmt = select(Source).order_by(Source.position.asc(), Source.id.asc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_source_by_id(db: AsyncSession, source_id: int) -> Optional[Source]:
    """ID bo'yicha bitta manbani olish."""
    stmt = select(Source).where(Source.id == source_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def delete_source(db: AsyncSession, source: Source) -> None:
    """Manbani o'chirish."""
    await db.delete(source)
    await db.commit()
