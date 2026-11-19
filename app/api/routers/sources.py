from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.source import Source
from app.schemas.source import SourceCreate, SourceUpdate, SourceResponse
from app.services.translator import translate_text
from app.services.cache_service import invalidate_sources_cache

router = APIRouter()


@router.get("", response_model=List[SourceResponse])
async def get_sources(
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Source).order_by(Source.position.asc(), Source.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Source).where(Source.id == source_id)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manba topilmadi"
        )
    return source


@router.post("", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: SourceCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    source_lang = payload.source_lang

    # Avtomatik tarjima qilish (uz, en, ru)
    # 1. Sarlavha tarjimasi
    title_uz = payload.title if source_lang == "uz" else await translate_text(payload.title, source_lang, "uz")
    title_en = payload.title if source_lang == "en" else await translate_text(payload.title, source_lang, "en")
    title_ru = payload.title if source_lang == "ru" else await translate_text(payload.title, source_lang, "ru")

    # 2. Matn tarjimasi
    text_uz = payload.text if source_lang == "uz" else await translate_text(payload.text, source_lang, "uz")
    text_en = payload.text if source_lang == "en" else await translate_text(payload.text, source_lang, "en")
    text_ru = payload.text if source_lang == "ru" else await translate_text(payload.text, source_lang, "ru")

    source = Source(
        title_uz=title_uz,
        title_en=title_en,
        title_ru=title_ru,
        text_uz=text_uz,
        text_en=text_en,
        text_ru=text_ru,
        position=0
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Manbalar keshini tozalash
    await invalidate_sources_cache()

    return source


@router.put("/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: int,
    payload: SourceUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Source).where(Source.id == source_id)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manba topilmadi"
        )

    source.title_uz = payload.title_uz
    source.title_en = payload.title_en
    source.title_ru = payload.title_ru
    source.text_uz = payload.text_uz
    source.text_en = payload.text_en
    source.text_ru = payload.text_ru
    if payload.position is not None:
        source.position = payload.position

    await db.commit()
    await db.refresh(source)

    # Manbalar keshini tozalash
    await invalidate_sources_cache()

    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    stmt = select(Source).where(Source.id == source_id)
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manba topilmadi"
        )

    await db.delete(source)
    await db.commit()

    # Manbalar keshini tozalash
    await invalidate_sources_cache()

    return None
