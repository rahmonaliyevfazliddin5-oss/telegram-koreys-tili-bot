import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.student import Student


async def sync_students_seed():
    db_url = settings.DATABASE_URL
    print(f"Baza ulanishi: {db_url}")

    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "students_seed.json")
    with open(json_path, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    print(f"Seed fayldan {len(seed_data)} ta o'quvchi o'qildi.")

    engine = create_async_engine(db_url)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Barcha mavjud o'quvchilarni olish
        res = await session.execute(select(Student))
        existing_students = res.scalars().all()

        # Raxmatullayev -> Rahmonaliyev almashtirish
        for s in existing_students:
            if (s.last_name or "").strip().lower() == "raxmatullayev" and s.first_name.strip().lower() == "fazliddin":
                s.last_name = "Rahmonaliyev"
                print("Mavjud Raxmatullayev Fazliddin -> Rahmonaliyev Fazliddin ga yangilandi.")

        existing_map = {}
        for s in existing_students:
            key = (s.last_name or "").strip().lower(), s.first_name.strip().lower()
            existing_map[key] = s

        added_count = 0
        updated_count = 0

        for item in seed_data:
            last_name = (item.get("last_name") or "").strip()
            first_name = (item.get("first_name") or "").strip()
            grade = item.get("grade")
            if grade is not None:
                grade = str(grade).strip()
            parent_phone = item.get("parent_phone")
            if parent_phone is not None:
                parent_phone = str(parent_phone).strip()

            key = (last_name.lower(), first_name.lower())
            if key in existing_map:
                existing = existing_map[key]
                existing.grade = grade
                existing.parent_phone = parent_phone
                updated_count += 1
            else:
                new_student = Student(
                    first_name=first_name,
                    last_name=last_name,
                    grade=grade,
                    parent_phone=parent_phone,
                    lesson_slots=None
                )
                session.add(new_student)
                added_count += 1

        await session.commit()
        print(f"Natija: {added_count} ta yangi qo'shildi, {updated_count} ta yangilandi.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(sync_students_seed())
