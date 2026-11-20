import zoneinfo
from datetime import datetime, date, time
from typing import Dict, Any, Optional

TASHKENT_TZ = zoneinfo.ZoneInfo("Asia/Tashkent")

LESSON_1_TIME = time(7, 0)
LESSON_1_START = time(7, 0)
LESSON_1_END = time(12, 0)

LESSON_2_TIME = time(15, 45)
LESSON_2_START = time(15, 30)
LESSON_2_END = time(20, 0)


def get_tashkent_now() -> datetime:
    """Toshkent vaqti bo'yicha joriy vaqtni qaytaradi."""
    return datetime.now(TASHKENT_TZ)


def is_weekend(d: Optional[date] = None) -> bool:
    """Shanba (5) yoki yakshanba (6) dam olish kuni ekanligini tekshiradi."""
    if d is None:
        d = get_tashkent_now().date()
    return d.weekday() in (5, 6)


def is_lesson_window_open(lesson: int, target_date: Optional[date] = None, target_time: Optional[time] = None) -> bool:
    """
    Muayyan dars va sana uchun davomat/baho oynasi ochiqligini tekshiradi.
    Faqat joriy ish kunida va belgilangan vaqt oralig'ida ochiq bo'ladi:
    - 1-dars: 07:00 - 12:00
    - 2-dars: 15:30 - 20:00
    Shanba va yakshanba doim yopiq.
    """
    now = get_tashkent_now()
    check_date = target_date if target_date is not None else now.date()
    check_time = target_time if target_time is not None else now.time()

    # Agar boshqa sana bo'lsa yoki dam olish kuni bo'lsa - yopiq
    if check_date != now.date() or is_weekend(check_date):
        return False

    if lesson == 1:
        return LESSON_1_START <= check_time <= LESSON_1_END
    elif lesson == 2:
        return LESSON_2_START <= check_time <= LESSON_2_END
    return False


def get_lesson_window_status(now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Toshkent vaqti bo'yicha joriy holat, dars vaqtlari va oyna holatini qaytaradi.
    """
    if now is None:
        now = get_tashkent_now()

    current_date = now.date()
    current_time_obj = now.time()
    weekend = is_weekend(current_date)

    lesson1_open = (not weekend) and (LESSON_1_START <= current_time_obj <= LESSON_1_END)
    lesson2_open = (not weekend) and (LESSON_2_START <= current_time_obj <= LESSON_2_END)

    active_lesson = 1 if lesson1_open else (2 if lesson2_open else None)

    return {
        "server_time": now.isoformat(),
        "date": str(current_date),
        "current_time": now.strftime("%H:%M"),
        "is_weekend": weekend,
        "active_lesson": active_lesson,
        "lesson1_open": lesson1_open,
        "lesson2_open": lesson2_open,
        "is_any_window_open": lesson1_open or lesson2_open,
        "lesson_1": {
            "lesson": 1,
            "time": LESSON_1_TIME.strftime("%H:%M"),
            "window_start": LESSON_1_START.strftime("%H:%M"),
            "window_end": LESSON_1_END.strftime("%H:%M"),
            "is_open": lesson1_open
        },
        "lesson_2": {
            "lesson": 2,
            "time": LESSON_2_TIME.strftime("%H:%M"),
            "window_start": LESSON_2_START.strftime("%H:%M"),
            "window_end": LESSON_2_END.strftime("%H:%M"),
            "is_open": lesson2_open
        }
    }
