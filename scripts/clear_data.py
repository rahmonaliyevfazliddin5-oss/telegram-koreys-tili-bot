import asyncio
import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def backup_before_clear(conn):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs("backups", exist_ok=True)
    backup_file = f"backups/db_backup_before_clear_{timestamp}.json"

    tables = [
        "students", "attendance_sessions", "attendance_marks",
        "lesson_absences", "grades", "fine_ledger", "lessons",
        "exams", "exam_grades"
    ]
    backup_data = {}
    for tbl in tables:
        try:
            res = await conn.execute(text(f"SELECT * FROM {tbl}"))
            rows = [dict(r._mapping) for r in res.fetchall()]
            for r in rows:
                for k, v in r.items():
                    if hasattr(v, "isoformat"):
                        r[k] = v.isoformat()
            backup_data[tbl] = rows
        except Exception as e:
            backup_data[tbl] = f"Error: {str(e)}"

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    print(f"Zaxira fayl saqlandi: {backup_file}")


async def clear_database():
    db_url = settings.DATABASE_URL
    print(f"Baza ulanishi: {db_url}")

    try:
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            print("Zaxira olinmoqda...")
            await backup_before_clear(conn)

            print("O'quvchilar va baholar ma'lumotlari tozalanmoqda...")
            clear_order = [
                "exam_grades",
                "grades",
                "attendance_marks",
                "lesson_absences",
                "absences",
                "attendance_sessions",
                "fine_ledger",
                "exams",
                "lessons",
                "students"
            ]
            for tbl in clear_order:
                try:
                    res = await conn.execute(text(f"DELETE FROM {tbl}"))
                    print(f"Tozalandi: {tbl}")
                except Exception as e:
                    print(f"{tbl} o'chirishda xatolik: {e}")

        await engine.dispose()
        print("Barcha o'quvchilar va baholar muvaffaqiyatli tozalandi.")

        # Redis keshini tozalash
        try:
            from app.redis import get_redis, close_redis
            redis = await get_redis()
            keys = await redis.keys("rating:*")
            if keys:
                await redis.delete(*keys)
            await close_redis()
            print("Redis keshi tozalandi.")
        except Exception as re:
            print(f"Redis keshini tozalashda eslatma: {re}")

    except Exception as ex:
        print(f"Baza bilan bog'lanishda xatolik: {ex}")


if __name__ == "__main__":
    asyncio.run(clear_database())
