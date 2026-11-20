from typing import Dict, Any, List, Optional
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert

from app.database import async_session_maker
from app.redis import redis_client
from app.models.bot_user import BotUser
from app.models.student import Student
from app.models.attendance import AttendanceMark, AttendanceSession, Absence
from app.models.grade import Grade
from app.models.lesson import Lesson
from app.models.source import Source
from app.i18n.texts import get_text
from app.services.time_service import get_tashkent_now, is_weekend
from app.services.attendance_service import (
    is_lesson_completed,
    get_all_students_derived_attendance_stats
)
from app.bot.keyboards.user_kb import (
    get_language_keyboard,
    get_main_menu_keyboard,
    get_students_pagination_keyboard,
    get_rating_pagination_keyboard
)
from app.services.rating_service import calculate_and_cache_rating
from app.services.cache_service import get_cached_sources, set_cached_sources

router = Router(name="user")


def format_main_menu_text(lang: str = "uz") -> str:
    lang = lang or "uz"
    today_date = get_tashkent_now().strftime("%Y-%m-%d")
    date_text = get_text("today_date", lang, date=today_date)
    if is_weekend():
        date_text += get_text("weekend_tag", lang)
    main_menu_title = get_text("main_menu", lang)
    return f"{date_text}\n\n{main_menu_title}"


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
async def user_start(message: Message, lang: Optional[str] = None):
    # Birinchi marta kirganda til tanlash so'raladi
    if not lang:
        await message.answer(
            get_text("choose_lang", "uz"),
            reply_markup=get_language_keyboard()
        )
        return

    # Avval til tanlagan bo'lsa bugungi sana va menyu chiqadi
    sources = await get_active_sources(lang)
    titles = [s["title"] for s in sources]
    await message.answer(
        format_main_menu_text(lang),
        reply_markup=get_main_menu_keyboard(lang, titles)
    )


@router.callback_query(F.data.startswith("lang:"))
async def process_language_choice(callback: CallbackQuery):
    selected_lang = callback.data.split(":")[1]
    user_id = callback.from_user.id

    # Bazada saqlash
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
        format_main_menu_text(selected_lang),
        reply_markup=get_main_menu_keyboard(selected_lang, titles)
    )


@router.message(F.text.in_([
    get_text("rating_btn", "uz"),
    get_text("rating_btn", "en"),
    get_text("rating_btn", "ru")
]))
@router.message(Command("rating"))
async def show_rating(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    async with async_session_maker() as session:
        rating_list = await calculate_and_cache_rating(session)

    # FAQAT 1-3 o'rinlar (ball > 0). 3-o'rindan pastdagilar ko'rinmaydi.
    top_students = [
        item for item in (rating_list or [])
        if item.get("total_score", 0) > 0 and item.get("rank", 999) <= 3
    ]

    if not top_students:
        await message.answer(get_text("rating_empty", user_lang))
        return

    lines = [get_text("rating_title", user_lang), ""]
    for item in top_students:
        name = f"{item['first_name']} {item.get('last_name') or ''}".strip()
        lines.append(f"{item['rank']}. {name} - {item['total_score']}")

    lines.append("")
    lines.append(get_text("rating_note", user_lang))

    await message.answer("\n".join(lines))


@router.callback_query(F.data.startswith("rate_page:"))
async def process_rating_page(callback: CallbackQuery, lang: Optional[str] = None):
    # Backward compatibility: agar eski xabarlardan sahifalash tugmasi bosilsa
    await callback.answer()


@router.message(F.text.in_([
    get_text("students_btn", "uz"),
    get_text("students_btn", "en"),
    get_text("students_btn", "ru")
]))
@router.message(Command("students"))
async def show_students(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    await render_students_page(message, user_lang, page=1)


def format_bot_late_display(minutes: Optional[int], lang: str = "uz") -> str:
    if not minutes:
        minutes = 0
    if minutes < 60:
        if lang == "en":
            return f"+{minutes} min late"
        elif lang == "ru":
            return f"+{minutes} мин опоздал(а)"
        return f"+{minutes} daqiqa kech qoldi"
    hours = minutes // 60
    rem = minutes % 60
    if rem == 0:
        if lang == "en":
            return f"+{hours} h late"
        elif lang == "ru":
            return f"+{hours} ч опоздал(а)"
        return f"+{hours} soat kech qoldi"
    if lang == "en":
        return f"+{hours} h {rem} min late"
    elif lang == "ru":
        return f"+{hours} ч {rem} мин опоздал(а)"
    return f"+{hours} soat {rem} daqiqa kech qoldi"


async def fetch_students_with_absences() -> List[Dict[str, Any]]:
    async with async_session_maker() as session:
        stats_map = await get_all_students_derived_attendance_stats(session)
        stmt = (
            select(Student)
            .order_by(
                func.coalesce(func.nullif(Student.last_name, ""), Student.first_name).asc(),
                Student.first_name.asc(),
                Student.id.asc()
            )
        )
        result = await session.execute(stmt)
        students = result.scalars().all()
        return [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "grade": s.grade,
                "absences_count": stats_map.get(s.id, {}).get("absences", 0),
                "lates_count": stats_map.get(s.id, {}).get("lates", 0)
            }
            for s in students
        ]


async def render_students_page(target: Message, lang: str, page: int = 1, is_edit: bool = False):
    students = await fetch_students_with_absences()
    if not students:
        msg = get_text("students_empty", lang)
        if is_edit:
            await target.edit_text(msg)
        else:
            await target.answer(msg)
        return

    page_size = 10
    total_pages = max(1, (len(students) + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))

    start_idx = (page - 1) * page_size
    page_students = students[start_idx:start_idx + page_size]

    lines = [
        get_text("students_title", lang, page=page, total_pages=total_pages),
        ""
    ]
    for i, s in enumerate(page_students):
        idx = start_idx + i + 1
        name = f"{s['first_name']} {s['last_name'] or ''}".strip()
        if "lates_count" in s:
            lines.append(
                get_text("student_with_lates_item", lang, idx=idx, name=name, absences=s["absences_count"], lates=s["lates_count"])
            )
        else:
            lines.append(
                get_text("student_absence_item", lang, idx=idx, name=name, absences=s["absences_count"])
            )

    text = "\n".join(lines)
    keyboard = get_students_pagination_keyboard(page, total_pages)

    if is_edit:
        try:
            await target.edit_text(text, reply_markup=keyboard)
        except Exception:
            pass
    else:
        await target.answer(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith("std_page:"))
async def process_students_page(callback: CallbackQuery, lang: Optional[str] = None):
    user_lang = lang or "uz"
    try:
        page = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        page = 1

    await render_students_page(callback.message, user_lang, page=page, is_edit=True)
    await callback.answer()


@router.message(F.text.in_([
    get_text("attendance_btn", "uz"),
    get_text("attendance_btn", "en"),
    get_text("attendance_btn", "ru")
]))
@router.message(Command("attendance"))
async def show_attendance(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    now = get_tashkent_now()
    today = now.date()
    today_str = today.strftime("%Y-%m-%d")

    async with async_session_maker() as session:
        # Check started lessons
        lessons_stmt = select(Lesson).where(Lesson.date == today)
        lessons_res = await session.execute(lessons_stmt)
        lessons_map = {l.lesson_no: l for l in lessons_res.scalars().all()}

        # Check late marks for today
        late_marks_stmt = (
            select(
                AttendanceMark.lesson_no,
                AttendanceMark.late_minutes,
                Student.first_name,
                Student.last_name
            )
            .join(Student, AttendanceMark.student_id == Student.id)
            .where(AttendanceMark.date == today, AttendanceMark.status == "late")
            .order_by(Student.last_name.asc(), Student.first_name.asc())
        )
        late_marks = (await session.execute(late_marks_stmt)).all()

        # Check all enrolled students
        students_stmt = select(Student).order_by(Student.last_name.asc(), Student.first_name.asc())
        all_students = (await session.execute(students_stmt)).scalars().all()

        # Grades for today
        grades_stmt = select(Grade).where(Grade.date == today)
        all_grades = (await session.execute(grades_stmt)).scalars().all()
        grades_set = {(g.student_id, g.lesson_no) for g in all_grades}

        # Present marks for today (if any)
        present_marks_stmt = select(AttendanceMark).where(
            AttendanceMark.date == today,
            AttendanceMark.status == "present"
        )
        present_marks = (await session.execute(present_marks_stmt)).scalars().all()
        present_set = {(m.student_id, m.lesson_no) for m in present_marks}

    title = get_text("attendance_title", user_lang, date=today_str)
    lines = [title]

    if is_weekend(today):
        lines.append(get_text("attendance_weekend_note", user_lang))
        lines.append("")
    else:
        lines.append("")

    for lesson_no in (1, 2):
        lesson_title_key = f"attendance_lesson{lesson_no}_title"
        lines.append(get_text(lesson_title_key, user_lang))

        lesson_obj = lessons_map.get(lesson_no)
        if not lesson_obj and not is_weekend(today):
            lines.append(get_text("attendance_not_started", user_lang))
        elif not is_lesson_completed(today, lesson_no, now) and not is_weekend(today):
            lines.append(get_text("attendance_in_progress", user_lang))
        else:
            absentees = []
            if lesson_obj:
                for s in all_students:
                    if s.created_at <= lesson_obj.started_at:
                        has_grade = (s.id, lesson_no) in grades_set
                        has_present = (s.id, lesson_no) in present_set
                        is_late = any(m.lesson_no == lesson_no and m.first_name == s.first_name and m.last_name == s.last_name for m in late_marks)
                        if not has_grade and not has_present and not is_late:
                            absentees.append(f"- {s.first_name} {s.last_name or ''}".strip())

            lates = [
                f"- {m.first_name} {m.last_name or ''} {format_bot_late_display(m.late_minutes, user_lang)}".strip()
                for m in late_marks if m.lesson_no == lesson_no
            ]

            if not absentees and not lates:
                lines.append(get_text("attendance_no_absentees", user_lang))
            else:
                if absentees:
                    lines.append(get_text("attendance_absentees_header", user_lang))
                    lines.extend(absentees)
                if lates:
                    lines.append(get_text("attendance_lates_header", user_lang))
                    lines.extend(lates)

        lines.append("")

    await message.answer("\n".join(lines).strip())


@router.message(F.text.in_([
    get_text("teacher_btn", "uz"),
    get_text("teacher_btn", "en"),
    get_text("teacher_btn", "ru")
]))
@router.message(Command("teacher"))
async def show_teacher_info(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    await message.answer(get_text("teacher_info", user_lang))


@router.message(F.text.in_([
    get_text("contact_btn", "uz"),
    get_text("contact_btn", "en"),
    get_text("contact_btn", "ru")
]))
@router.message(Command("contact"))
async def show_contact(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    # send_contact orqali kontakt kartasi (+998901644566)
    await message.answer_contact(
        phone_number="+998901644566",
        first_name="Koreys tili",
        last_name="O'qituvchi"
    )
    # Bosiladigan kontakt matni
    await message.answer(get_text("contact_details", user_lang))


@router.message(F.text)
async def show_resource_content(message: Message, lang: Optional[str] = None):
    user_lang = lang or "uz"
    sources = await get_active_sources(user_lang)

    matched = next((s for s in sources if s["title"] == message.text), None)
    if matched:
        await message.answer(matched["text"])
