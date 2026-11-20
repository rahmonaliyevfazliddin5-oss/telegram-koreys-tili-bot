from typing import Optional
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, ReplyKeyboardRemove
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from app.config import settings
from app.redis import redis_client
from app.database import async_session_maker
from app.services.auth_service import verify_admin_password
from app.services.time_service import get_tashkent_now, is_weekend
from app.i18n.texts import get_text
from app.bot.keyboards.admin_kb import (
    get_admin_webapp_keyboard,
    get_admin_exit_reply_keyboard
)
from app.bot.keyboards.user_kb import get_main_menu_keyboard

router = Router(name="admin")

GLOBAL_BLOCK_KEY = "admin_block_global"
GLOBAL_FAIL_KEY = "admin_fail_global"
GLOBAL_BLOCK_TTL = 1800  # 30 daqiqa (soniyalarda)


class AdminState(StatesGroup):
    waiting_for_code = State()


def get_menu_header(lang: str = "uz") -> str:
    lang = lang or "uz"
    today_date = get_tashkent_now().strftime("%Y-%m-%d")
    date_text = get_text("today_date", lang, date=today_date)
    if is_weekend():
        date_text += get_text("weekend_tag", lang)
    main_menu_title = get_text("main_menu", lang)
    return f"{date_text}\n\n{main_menu_title}"


@router.message(Command("admin"))
async def admin_start(message: Message, state: FSMContext, lang: Optional[str] = None):
    user_lang = lang or "uz"
    user_id = message.from_user.id

    # 1. Global blok tekshiruvi (30 daqiqa)
    ttl = await redis_client.ttl(GLOBAL_BLOCK_KEY)
    if ttl and ttl > 0:
        minutes = max(1, (ttl + 59) // 60)
        await message.answer(
            get_text("admin_currently_blocked", user_lang, minutes=minutes)
        )
        return

    # 2. Faol admin sessiyasi mavjud bo'lsa darhol panelni ko'rsatish
    session_key = f"admin_session:{user_id}"
    if await redis_client.get(session_key):
        await state.clear()
        # ReplyKeyboardMarkup'da 'Admindan chiqish' doimiy tugmasi
        await message.answer(
            get_text("admin_panel_title", user_lang),
            reply_markup=get_admin_exit_reply_keyboard(user_lang)
        )
        # Inline WebApp tugmasi
        await message.answer(
            get_text("admin_login_success", user_lang),
            reply_markup=get_admin_webapp_keyboard(user_lang)
        )
        return

    # 3. Kod so'rash
    await state.set_state(AdminState.waiting_for_code)
    await message.answer(get_text("admin_prompt_code", user_lang))


@router.message(AdminState.waiting_for_code, F.text)
async def admin_check_code(message: Message, state: FSMContext, lang: Optional[str] = None):
    user_lang = lang or "uz"
    user_id = message.from_user.id
    entered_code = message.text.strip()

    # 1. Global blok tekshiruvi
    ttl = await redis_client.ttl(GLOBAL_BLOCK_KEY)
    if ttl and ttl > 0:
        minutes = max(1, (ttl + 59) // 60)
        await state.clear()
        await message.answer(
            get_text("admin_currently_blocked", user_lang, minutes=minutes)
        )
        return

    # 2. Parolni tekshirish (admin_settings xeshi yoki dastlabki 0727)
    async with async_session_maker() as session:
        is_correct = await verify_admin_password(session, entered_code)

    if is_correct:
        await state.clear()
        # Noto'g'ri urinishlar hisoblagichini tozalash
        await redis_client.delete(GLOBAL_FAIL_KEY)

        # 12 soatlik admin sessiyasi ochish
        session_key = f"admin_session:{user_id}"
        await redis_client.set(session_key, "1", ex=settings.ADMIN_SESSION_TTL)

        # ReplyKeyboardMarkup'da 'Admindan chiqish' doimiy tugmasi
        await message.answer(
            get_text("admin_panel_title", user_lang),
            reply_markup=get_admin_exit_reply_keyboard(user_lang)
        )
        # Inline WebApp tugmasi va 'Siz admin panelga kirdingiz' xabari
        await message.answer(
            get_text("admin_login_success", user_lang),
            reply_markup=get_admin_webapp_keyboard(user_lang)
        )
        return

    # 3. Parol noto'g'ri bo'lsa
    current_fails = await redis_client.incr(GLOBAL_FAIL_KEY)
    if current_fails == 1:
        await redis_client.expire(GLOBAL_FAIL_KEY, 3600)

    if current_fails >= 3:
        # 3 marta noto'g'ri urinishda 30 daqiqa global blok
        await redis_client.set(GLOBAL_BLOCK_KEY, "1", ex=GLOBAL_BLOCK_TTL)
        await redis_client.delete(GLOBAL_FAIL_KEY)
        await state.clear()

        # Barcha mavjud admin sessiyalarini o'chirish (admin_session:*)
        keys = await redis_client.keys("admin_session:*")
        if keys:
            await redis_client.delete(*keys)

        await message.answer(get_text("admin_blocked_alert", user_lang))
    else:
        attempts_left = 3 - current_fails
        await message.answer(
            get_text("admin_wrong_code", user_lang, attempts=attempts_left)
        )


@router.message(F.text.in_([
    "Admindan chiqish",
    "admin_exit",
    get_text("admin_exit_btn", "uz"),
    get_text("admin_exit_btn", "en"),
    get_text("admin_exit_btn", "ru")
]))
@router.message(Command("logout"))
async def admin_logout_handler(message: Message, state: FSMContext, lang: Optional[str] = None):
    user_lang = lang or "uz"
    user_id = message.from_user.id

    # Sessiyani o'chirish
    session_key = f"admin_session:{user_id}"
    await redis_client.delete(session_key)
    await state.clear()

    # ReplyKeyboardRemove orqali admin klaviaturasini olib tashlash va xabar berish
    await message.answer(
        get_text("admin_logout_success", user_lang),
        reply_markup=ReplyKeyboardRemove()
    )

    # Oddiy foydalanuvchi asosiy menyusini qaytarish
    from app.bot.handlers.user import get_active_sources
    sources = await get_active_sources(user_lang)
    titles = [s["title"] for s in sources]
    menu_text = get_menu_header(user_lang)
    await message.answer(
        menu_text,
        reply_markup=get_main_menu_keyboard(user_lang, titles)
    )


@router.callback_query(F.data == "admin_exit")
async def admin_logout_callback(callback: CallbackQuery, state: FSMContext, lang: Optional[str] = None):
    user_lang = lang or "uz"
    user_id = callback.from_user.id

    session_key = f"admin_session:{user_id}"
    await redis_client.delete(session_key)
    await state.clear()

    await callback.answer(get_text("admin_logout_success", user_lang))

    from app.bot.handlers.user import get_active_sources
    sources = await get_active_sources(user_lang)
    titles = [s["title"] for s in sources]
    menu_text = get_menu_header(user_lang)

    await callback.message.answer(
        get_text("admin_logout_success", user_lang),
        reply_markup=ReplyKeyboardRemove()
    )
    await callback.message.answer(
        menu_text,
        reply_markup=get_main_menu_keyboard(user_lang, titles)
    )
