from typing import Any, Dict

TEXTS: Dict[str, Dict[str, str]] = {
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
    "today_date": {
        "uz": "Bugungi sana: {date}",
        "en": "Today's date: {date}",
        "ru": "Сегодняшняя дата: {date}"
    },
    "weekend_tag": {
        "uz": " (Dam olish kuni)",
        "en": " (Weekend)",
        "ru": " (Выходной день)"
    },
    "rating_btn": {
        "uz": "Reyting",
        "en": "Rating",
        "ru": "Рейтинг"
    },
    "rating_title": {
        "uz": "O'quvchilar reytingi (Top-3):",
        "en": "Top-3 Students Rating:",
        "ru": "Рейтинг учащихся (Топ-3):"
    },
    "rating_empty": {
        "uz": "Reyting mavjud emas yoki ball to'plagan o'quvchilar yo'q.",
        "en": "Rating is not available or no students have scores.",
        "ru": "Рейтинг недоступен или нет учащихся с баллами."
    },
    "rating_note": {
        "uz": "Izoh: Reytingda faqat eng yuqori natijaga ega dastlabki 3 ta o'quvchi (ball > 0) ko'rsatiladi.",
        "en": "Note: The rating only displays the top 3 students with the highest scores (score > 0).",
        "ru": "Примечание: В рейтинге отображаются только первые 3 ученика с наивысшими баллами (балл > 0)."
    },
    "students_btn": {
        "uz": "O'quvchilar",
        "en": "Students",
        "ru": "Учащиеся"
    },
    "students_title": {
        "uz": "O'quvchilar ro'yxati (Sahifa {page}/{total_pages}):",
        "en": "Students list (Page {page}/{total_pages}):",
        "ru": "Список учащихся (Страница {page}/{total_pages}):"
    },
    "student_absence_item": {
        "uz": "{idx}. {name} - {absences} marta dars qoldirgan",
        "en": "{idx}. {name} - {absences} absences",
        "ru": "{idx}. {name} - пропусков: {absences}"
    },
    "students_empty": {
        "uz": "O'quvchilar topilmadi.",
        "en": "No students found.",
        "ru": "Учащиеся не найдены."
    },
    "attendance_btn": {
        "uz": "Davomat",
        "en": "Attendance",
        "ru": "Посещаемость"
    },
    "attendance_title": {
        "uz": "Bugungi davomat ({date}):",
        "en": "Today's attendance ({date}):",
        "ru": "Посещаемость на сегодня ({date}):"
    },
    "attendance_weekend_note": {
        "uz": "Bugun dam olish kuni. Darslar o'tkazilmaydi.",
        "en": "Today is a weekend. No lessons scheduled.",
        "ru": "Сегодня выходной день. Занятия не проводятся."
    },
    "attendance_lesson1_title": {
        "uz": "1-dars (07:00):",
        "en": "Lesson 1 (07:00):",
        "ru": "1-й урок (07:00):"
    },
    "attendance_lesson2_title": {
        "uz": "2-dars (15:45):",
        "en": "Lesson 2 (15:45):",
        "ru": "2-й урок (15:45):"
    },
    "attendance_no_absentees": {
        "uz": "Kelmaganlar yo'q (barcha o'quvchilar qatnashgan)",
        "en": "No absences (all students attended)",
        "ru": "Пропусков нет (все учащиеся присутствовали)"
    },
    "attendance_absentees_header": {
        "uz": "Kelmaganlar ro'yxati:",
        "en": "Absentees list:",
        "ru": "Список отсутствовавших:"
    },
    "teacher_btn": {
        "uz": "O'qituvchi haqida",
        "en": "About teacher",
        "ru": "О преподавателе"
    },
    "teacher_info": {
        "uz": (
            "O'qituvchi haqida ma'lumot:\n\n"
            "Ism: Koreys tili ustozi\n"
            "Malaka: TOPIK II (6-daraja), Janubiy Koreya universitetlari bitiruvchisi\n"
            "Tajriba: 5 yildan ortiq professional pedagogik faoliyat\n"
            "Yo'nalishlar: Boshlang'ichdan professional darajagacha koreys tili, grammatika, leksika, so'zlashuv va TOPIK imtihonlariga tayyorlov."
        ),
        "en": (
            "Information about the teacher:\n\n"
            "Name: Korean Language Instructor\n"
            "Qualification: TOPIK II (Level 6), graduate of South Korean universities\n"
            "Experience: Over 5 years of professional teaching experience\n"
            "Courses: Korean language from beginner to advanced level, grammar, vocabulary, conversational fluency, and TOPIK exam preparation."
        ),
        "ru": (
            "Информация о преподавателе:\n\n"
            "Имя: Преподаватель корейского языка\n"
            "Квалификация: TOPIK II (6-й уровень), выпускник университетов Южной Кореи\n"
            "Опыт: Более 5 лет профессионального педагогического стажа\n"
            "Направления: Корейский язык от начального до продвинутого уровня, грамматика, лексика, разговорная практика и подготовка к экзамену TOPIK."
        )
    },
    "contact_btn": {
        "uz": "Bog'lanish",
        "en": "Contact",
        "ru": "Связаться"
    },
    "contact_details": {
        "uz": (
            "Bog'lanish uchun ma'lumotlar:\n\n"
            "Telefon: +998901644566\n"
            "Telegram: @koreys_admin\n\n"
            "Savollar yoki darslarga yozilish bo'yicha yuqoridagi kontakt orqali bog'lanishingiz mumkin."
        ),
        "en": (
            "Contact details:\n\n"
            "Phone: +998901644566\n"
            "Telegram: @koreys_admin\n\n"
            "For inquiries or enrollment, feel free to reach out via the contact above."
        ),
        "ru": (
            "Контактная информация:\n\n"
            "Телефон: +998901644566\n"
            "Telegram: @koreys_admin\n\n"
            "По вопросам записи на занятия обращайтесь по указанным выше контактам."
        )
    },
    "admin_prompt_code": {
        "uz": "Kodni kiriting:",
        "en": "Enter admin code:",
        "ru": "Введите код администратора:"
    },
    "admin_wrong_code": {
        "uz": "Noto'g'ri kod. Qolgan urinishlar: {attempts}",
        "en": "Incorrect code. Remaining attempts: {attempts}",
        "ru": "Неверный код. Оставшиеся попытки: {attempts}"
    },
    "admin_blocked_alert": {
        "uz": "3 marta xato kiritildi. Tizim 30 daqiqaga global bloklandi.",
        "en": "3 incorrect attempts. The system is globally blocked for 30 minutes.",
        "ru": "3 неверные попытки. Система глобально заблокирована на 30 минут."
    },
    "admin_currently_blocked": {
        "uz": "Tizim global bloklangan. Qolgan vaqt: {minutes} daqiqa.",
        "en": "System is globally blocked. Remaining time: {minutes} minutes.",
        "ru": "Система глобально заблокирована. Осталось времени: {minutes} минут."
    },
    "admin_login_success": {
        "uz": "Siz admin panelga kirdingiz",
        "en": "You have entered the admin panel",
        "ru": "Вы вошли в панель администратора"
    },
    "admin_logout_success": {
        "uz": "Siz admin paneldan chiqdingiz",
        "en": "You have exited the admin panel",
        "ru": "Вы вышли из панели администратора"
    },
    "admin_panel_title": {
        "uz": "Admin paneli:",
        "en": "Admin panel:",
        "ru": "Панель администратора:"
    },
    "admin_exit_btn": {
        "uz": "Admindan chiqish",
        "en": "Admindan chiqish",
        "ru": "Admindan chiqish"
    },
    "admin_webapp_btn": {
        "uz": "Mini App",
        "en": "Mini App",
        "ru": "Mini App"
    }
}


def get_text(key: str, lang: str = "uz", **kwargs: Any) -> str:
    lang = lang or "uz"
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
