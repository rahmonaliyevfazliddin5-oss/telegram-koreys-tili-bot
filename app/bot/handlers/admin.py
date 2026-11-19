from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from app.config import settings
from app.redis import redis_client
from app.i18n.texts import get_text
from app.bot.keyboards.admin_kb import get_admin_webapp_keyboard

router = Router(name="admin")


class AdminState(StatesGroup):
    waiting_for_code = State()


@router.message(Command("admin"))
async def admin_start(message: Message, state: FSMContext):
    user_id = message.from_user.id
    block_key = f"admin_block:{user_id}"

    # Bloklanganlikni tekshirish
    ttl = await redis_client.ttl(block_key)
    if ttl and ttl > 0:
        minutes = (ttl // 60) + 1
        await message.answer(
            get_text("admin_currently_blocked", minutes=minutes)
        )
        return

    # Kod so'rash
    await state.set_state(AdminState.waiting_for_code)
    await message.answer(get_text("admin_prompt_code"))


@router.message(AdminState.waiting_for_code, F.text)
async def admin_check_code(message: Message, state: FSMContext):
    user_id = message.from_user.id
    block_key = f"admin_block:{user_id}"
    fail_key = f"admin_fail:{user_id}"
    entered_code = message.text.strip()

    # Kod to'g'ri bo'lsa
    if entered_code == settings.ADMIN_CODE:
        await state.clear()
        await redis_client.delete(fail_key)
        
        # 12 soatlik (ADMIN_SESSION_TTL) imzolangan admin sessiya kaliti
        session_key = f"admin_session:{user_id}"
        await redis_client.set(session_key, "1", ex=settings.ADMIN_SESSION_TTL)

        await message.answer(
            get_text("admin_panel_title"),
            reply_markup=get_admin_webapp_keyboard()
        )
        return

    # Kod noto'g'ri bo'lsa
    current_fails = await redis_client.incr(fail_key)
    # Fail kaliti uchun TTL 1 soat
    if current_fails == 1:
        await redis_client.expire(fail_key, 3600)

    if current_fails >= 3:
        # 15 daqiqaga (900 soniya) bloklash
        await redis_client.set(block_key, "1", ex=900)
        await redis_client.delete(fail_key)
        await state.clear()
        await message.answer(get_text("admin_blocked_alert"))
    else:
        attempts_left = 3 - current_fails
        await message.answer(
            get_text("admin_wrong_code", attempts=attempts_left)
        )
