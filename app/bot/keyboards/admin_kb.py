from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from app.config import settings
from app.i18n.texts import get_text


def get_admin_webapp_keyboard() -> InlineKeyboardMarkup:
    btn_text = get_text("admin_webapp_btn")
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
