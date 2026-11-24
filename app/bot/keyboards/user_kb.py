from typing import List, Optional
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo
)
from app.config import settings
from app.i18n.texts import get_text


def get_language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="O'zbekcha", callback_data="lang:uz")],
            [InlineKeyboardButton(text="English", callback_data="lang:en")],
            [InlineKeyboardButton(text="Русский", callback_data="lang:ru")]
        ]
    )


def get_main_menu_keyboard(lang: str = "uz", resource_titles: Optional[List[str]] = None) -> ReplyKeyboardMarkup:
    rating_text = get_text("rating_btn", lang)
    students_text = get_text("students_btn", lang)
    attendance_text = get_text("attendance_btn", lang)
    teacher_text = get_text("teacher_btn", lang)
    contact_text = get_text("contact_btn", lang)
    miniapp_text = get_text("user_miniapp_btn", lang)
    portal_url = f"{settings.WEBAPP_URL}/app"

    keyboard = [
        [KeyboardButton(text=miniapp_text, web_app=WebAppInfo(url=portal_url))],
        [KeyboardButton(text=rating_text), KeyboardButton(text=students_text)],
        [KeyboardButton(text=attendance_text), KeyboardButton(text=teacher_text)],
        [KeyboardButton(text=contact_text)]
    ]

    if resource_titles:
        for title in resource_titles:
            keyboard.append([KeyboardButton(text=title)])

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        is_persistent=True
    )


def get_portal_webapp_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    btn_text = get_text("user_miniapp_btn", lang)
    webapp_url = f"{settings.WEBAPP_URL}/app"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=btn_text,
                    web_app=WebAppInfo(url=webapp_url)
                )
            ]
        ]
    )


def get_students_pagination_keyboard(current_page: int, total_pages: int) -> InlineKeyboardMarkup:
    buttons = []
    if current_page > 1:
        buttons.append(
            InlineKeyboardButton(text="<", callback_data=f"std_page:{current_page - 1}")
        )
    if current_page < total_pages:
        buttons.append(
            InlineKeyboardButton(text=">", callback_data=f"std_page:{current_page + 1}")
        )

    if not buttons:
        return InlineKeyboardMarkup(inline_keyboard=[])

    return InlineKeyboardMarkup(inline_keyboard=[buttons])


def get_rating_pagination_keyboard(current_page: int, total_pages: int) -> InlineKeyboardMarkup:
    buttons = []
    if current_page > 1:
        buttons.append(
            InlineKeyboardButton(text="<", callback_data=f"rate_page:{current_page - 1}")
        )
    if current_page < total_pages:
        buttons.append(
            InlineKeyboardButton(text=">", callback_data=f"rate_page:{current_page + 1}")
        )

    if not buttons:
        return InlineKeyboardMarkup(inline_keyboard=[])

    return InlineKeyboardMarkup(inline_keyboard=[buttons])


def get_attendance_lessons_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    t1 = "1-dars tafsilotlari" if lang == "uz" else ("Lesson 1 details" if lang == "en" else "Детали 1-урока")
    t2 = "2-dars tafsilotlari" if lang == "uz" else ("Lesson 2 details" if lang == "en" else "Детали 2-урока")
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t1, callback_data="att_detail:1"),
                InlineKeyboardButton(text=t2, callback_data="att_detail:2")
            ]
        ]
    )


def get_attendance_back_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    t = "Orqaga" if lang == "uz" else ("Back" if lang == "en" else "Назад")
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t, callback_data="att_back")]
        ]
    )
