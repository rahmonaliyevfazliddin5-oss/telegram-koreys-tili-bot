from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo
)
from app.config import settings
from app.i18n.texts import get_text


def get_admin_webapp_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    btn_text = get_text("admin_webapp_btn", lang)
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


def get_admin_exit_reply_keyboard(lang: str = "uz") -> ReplyKeyboardMarkup:
    btn_text = get_text("admin_exit_btn", lang)
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=btn_text)]
        ],
        resize_keyboard=True,
        is_persistent=True
    )
