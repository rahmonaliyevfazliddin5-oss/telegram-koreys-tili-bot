TEXTS = {
    "choose_lang": {
        "uz": "Tilni tanlang:",
        "en": "Choose language:",
        "ru": "Выберите язык:"
    },
    "main_menu": {
        "uz": "Asosiy menyu:",
        "en": "Main menu:",
        "ru": "Главное меню:"
    },
    "rating_btn": {
        "uz": "Reyting",
        "en": "Rating",
        "ru": "Рейтинг"
    },
    "rating_title": {
        "uz": "O'quvchilar reytingi:",
        "en": "Students rating:",
        "ru": "Рейтинг учащихся:"
    },
    "rating_empty": {
        "uz": "Reyting mavjud emas.",
        "en": "Rating is not available.",
        "ru": "Рейтинг недоступен."
    },
    "admin_prompt_code": "Kodni kiriting:",
    "admin_wrong_code": "Noto'g'ri kod. Qolgan urinishlar: {attempts}",
    "admin_blocked_alert": "3 marta xato kiritildi. Siz 15 daqiqaga bloklandingiz.",
    "admin_currently_blocked": "Siz bloklangansiz. Qolgan vaqt: {minutes} daqiqa.",
    "admin_panel_title": "Admin paneli:",
    "admin_webapp_btn": "Mini App"
}


def get_text(key: str, lang: str = "uz", **kwargs) -> str:
    val = TEXTS.get(key)
    if isinstance(val, dict):
        text_template = val.get(lang, val.get("uz", ""))
    elif isinstance(val, str):
        text_template = val
    else:
        text_template = ""
    
    if kwargs:
        return text_template.format(**kwargs)
    return text_template
