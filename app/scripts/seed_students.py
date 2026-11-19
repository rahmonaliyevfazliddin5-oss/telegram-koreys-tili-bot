import asyncio
import json
from pathlib import Path
from sqlalchemy import select
from app.database import async_session_maker, engine
from app.models.student import Student
from app.services.cache_service import invalidate_rating_cache
from app.redis import close_redis


async def seed_students() -> None:
    seed_file = Path("data/students_seed.json")
    if not seed_file.exists():
        seed_file = Path(__file__).resolve().parent.parent.parent / "data" / "students_seed.json"
    if not seed_file.exists():
        print(f"Fayl topilmadi: {seed_file}")
        return

    with open(seed_file, "r", encoding="utf-8") as f:
        students_data = json.load(f)

    added_count = 0
    skipped_count = 0

    async with async_session_maker() as session:
        async with session.begin():
            result = await session.execute(select(Student.last_name, Student.first_name))
            existing_records = {
                (row[0] or "", row[1]) for row in result.all()
            }

            to_add = []
            for item in students_data:
                last_name = item.get("last_name") or ""
                first_name = item.get("first_name") or ""

                if (last_name, first_name) in existing_records:
                    skipped_count += 1
                else:
                    new_student = Student(
                        last_name=last_name,
                        first_name=first_name,
                        grade=None
                    )
                    to_add.append(new_student)
                    existing_records.add((last_name, first_name))
                    added_count += 1

            if to_add:
                session.add_all(to_add)

    await invalidate_rating_cache()
    await close_redis()
    await engine.dispose()

    print(f"Muvaffaqiyatli yakunlandi: {added_count} ta qo'shildi, {skipped_count} ta o'tkazib yuborildi.")


if __name__ == "__main__":
    asyncio.run(seed_students())
