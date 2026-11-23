import asyncio
import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def backup_before_wipe(conn):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs("backups", exist_ok=True)
    backup_file = f"backups/db_backup_before_grades_wipe_{timestamp}.json"

    tables = [
        "students", "attendance_marks", "lesson_absences",
        "grades", "fine_ledger", "lessons", "exams", "exam_grades"
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
    print(f"Zaxira nusxa saqlandi: {backup_file}")


async def wipe_grades_and_lessons():
    db_urls = [settings.DATABASE_URL]
    # Agar postgres hosti topilmasa localhost bilan urinib ko'rish
    if "postgres:5432" in settings.DATABASE_URL:
        db_urls.append(settings.DATABASE_URL.replace("postgres:5432", "localhost:5432"))

    success = False
    for db_url in db_urls:
        try:
            print(f"Baza ulanishi sinab ko'rilmoqda: {db_url}")
            engine = create_async_engine(db_url)
            async with engine.begin() as conn:
                print("Eski ma'lumotlar zaxirasi olinmoqda...")
                await backup_before_wipe(conn)

                print("Baholar, imtihonlar, davomat va darslar tozalanmoqda...")
                tables_to_clear = [
                    "exam_grades",
                    "grades",
                    "attendance_marks",
                    "lesson_absences",
                    "fine_ledger",
                    "exams",
                    "lessons"
                ]
                for tbl in tables_to_clear:
                    try:
                        await conn.execute(text(f"DELETE FROM {tbl}"))
                        print(f"Tozalandi: {tbl}")
                    except Exception as e:
                        print(f"{tbl} tozalanmadi yoki mavjud emas: {e}")

                # O'quvchilar sonini tekshirish
                count_res = await conn.execute(text("SELECT COUNT(*) FROM students"))
                st_count = count_res.scalar()
                print(f"Bazadagi saqlanib qolgan o'quvchilar soni: {st_count}")

            await engine.dispose()
            success = True
            break
        except Exception as ex:
            print(f"{db_url} bilan ulanish amalga oshmadi: {ex}")

    # Redis keshini tozalash
    try:
        from app.redis import get_redis, close_redis
        redis = await get_redis()
        keys = await redis.keys("rating:*")
        if keys:
            await redis.delete(*keys)
        await close_redis()
        print("Redis reyting keshi tozalandi.")
    except Exception as re:
        print(f"Redis kesh: {re}")

    if success:
        print("Barcha baholar va darslar tozalandi. O'quvchilar ro'yxati saqlab qolindi.")
    else:
        print("Baza bilan ulanish serverda yoki docker konteynerda ishga tushiriladi.")


if __name__ == "__main__":
    asyncio.run(wipe_grades_and_lessons())
