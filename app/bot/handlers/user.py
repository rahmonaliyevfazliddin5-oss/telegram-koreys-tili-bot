from typing import Dict, Any, List
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.database import async_session_maker
from app.redis import redis_client
from app.models.bot_user import BotUser
from app.models.source import Source
from app.i18n.texts import get_text
from app.bot.keyboards.user_kb import (
    get_language_keyboard,
    get_main_menu_keyboard,
    get_rating_pagination_keyboard
)
from app.services.rating_service import calculate_and_cache_rating, paginate_rating
from app.services.cache_service import get_cached_sources, set_cached_sources

router = Router(name="user")


async def get_active_sources(lang: str) -> List[Dict[str, Any]]:
    cached = await get_cached_sources(lang)
    if cached is not None:
        return cached

    async with async_session_maker() as session:
        stmt = select(Source).order_by(Source.position.asc(), Source.id.asc())
        result = await session.execute(stmt)
        sources = result.scalars().all()

        source_list = []
        for s in sources:
            title = getattr(s, f"title_{lang}", s.title_uz)
            text_val = getattr(s, f"text_{lang}", s.text_uz)
            source_list.append({
                "id": s.id,
                "title": title,
                "text": text_val
            })

        await set_cached_sources(lang, source_list)
        return source_list


@router.message(CommandStart())
async def user_start(message: Message, lang: str | None):
    # Birinchi marta kirganda til tanlash so'raladi
    if not lang:
        await message.answer(
            get_text("choose_lang", "uz"),
            reply_markup=get_language_keyboard()
        )
        return

    # Avval til tanlagan bo'lsa to'g'ridan-to'g'ri asosiy menyu chiqadi
    sources = await get_active_sources(lang)
    titles = [s["title"] for s in sources]
    await message.answer(
        get_text("main_menu", lang),
        reply_markup=get_main_menu_keyboard(lang, titles)
    )


@router.callback_query(F.data.startswith("lang:"))
async def process_language_choice(callback: CallbackQuery):
    selected_lang = callback.data.split(":")[1]
    user_id = callback.from_user.id

    # Bazada saqlash (Upsert)
    async with async_session_maker() as session:
        stmt = insert(BotUser).values(
            telegram_id=user_id,
            language=selected_lang
        ).on_conflict_do_update(
            index_elements=[BotUser.telegram_id],
            set_={"language": selected_lang}
        )
        await session.execute(stmt)
        await session.commit()

    # Redis keshga yozish
    await redis_client.set(f"user_lang:{user_id}", selected_lang, ex=86400 * 7)

    await callback.answer()
    try:
        await callback.message.delete()
    except Exception:
        pass

    sources = await get_active_sources(selected_lang)
    titles = [s["title"] for s in sources]
    await callback.message.answer(
        get_text("main_menu", selected_lang),
        reply_markup=get_main_menu_keyboard(selected_lang, titles)
    )


@router.message(F.text.in_([
    get_text("rating_btn", "uz"),
    get_text("rating_btn", "en"),
    get_text("rating_btn", "ru")
]))
async def show_rating(message: Message, lang: str):
    user_lang = lang or "uz"
    async with async_session_maker() as session:
        rating_list = await calculate_and_cache_rating(session)

    if not rating_list:
        await message.answer(get_text("rating_empty", user_lang))
        return

    items, total_pages = paginate_rating(rating_list, page=1, page_size=10)
    lines = [get_text("rating_title", user_lang), ""]
    for item in items:
        name = f"{item['first_name']} {item.get('last_name') or ''}".strip()
        lines.append(f"{item['rank']}. {name} - {item['total_score']}")

    await message.answer(
        "\n".join(lines),
        reply_markup=get_rating_pagination_keyboard(1, total_pages)
    )


@router.callback_query(F.data.startswith("rate_page:"))
async def process_rating_page(callback: CallbackQuery, lang: str):
    user_lang = lang or "uz"
    page = int(callback.data.split(":")[1])

    async with async_session_maker() as session:
        rating_list = await calculate_and_cache_rating(session)

    if not rating_list:
        await callback.answer()
        return

    items, total_pages = paginate_rating(rating_list, page=page, page_size=10)
    lines = [get_text("rating_title", user_lang), ""]
    for item in items:
        name = f"{item['first_name']} {item.get('last_name') or ''}".strip()
        lines.append(f"{item['rank']}. {name} - {item['total_score']}")

    try:
        await callback.message.edit_text(
            "\n".join(lines),
            reply_markup=get_rating_pagination_keyboard(page, total_pages)
        )
    except Exception:
        pass
    await callback.answer()


@router.message(F.text)
async def show_resource_content(message: Message, lang: str):
    user_lang = lang or "uz"
    sources = await get_active_sources(user_lang)

    matched = next((s for s in sources if s["title"] == message.text), None)
    if matched:
        await message.answer(matched["text"])
