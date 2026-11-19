from typing import List
from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton
)
from app.i18n.texts import get_text


def get_language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="O'zbekcha", callback_data="lang:uz")],
            [InlineKeyboardButton(text="English", callback_data="lang:en")],
            [InlineKeyboardButton(text="Русский", callback_data="lang:ru")]
        ]
    )


def get_main_menu_keyboard(lang: str, resource_titles: List[str]) -> ReplyKeyboardMarkup:
    rating_text = get_text("rating_btn", lang)
    keyboard = [[KeyboardButton(text=rating_text)]]
    
    for title in resource_titles:
        keyboard.append([KeyboardButton(text=title)])
        
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        is_persistent=True
    )


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
