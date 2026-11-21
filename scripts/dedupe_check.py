import asyncio
import os
import sys
import json
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def normalize_name(s: str) -> str:
    if not s:
        return ""
    for ch in ["‘", "’", "ʻ", "`", "´"]:
        s = s.replace(ch, "'")
    return " ".join(s.strip().lower().split())

async def check_duplicates():
    # 1. Check in students_seed.json
    seed_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "students_seed.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)
        print(f"--- SEED FAYL TEKSHIRUVI ({len(seed_data)} ta o'quvchi) ---")
        seen_seed = defaultdict(list)
        for idx, item in enumerate(seed_data):
            fn = normalize_name(item.get("first_name", ""))
            ln = normalize_name(item.get("last_name", ""))
            key = f"{ln} {fn}".strip()
            seen_seed[key].append((idx, item))
        
        seed_dupes = {k: v for k, v in seen_seed.items() if len(v) > 1}
        if seed_dupes:
            print(f"Seed faylda {len(seed_dupes)} ta dublikat topildi:")
            for k, items in seed_dupes.items():
                print(f"  '{k}': {items}")
        else:
            print("Seed faylda hech qanday dublikat yo'q (46 ta unikal yozuv).")

    # 2. Check in database
    print(f"\n--- MA'LUMOTLAR BAZASI TEKSHIRUVI ---")
    try:
        from app.database import async_session_maker
        from app.models.student import Student
        from sqlalchemy import select
        async with async_session_maker() as session:
            stmt = select(Student)
            res = await session.execute(stmt)
            students = res.scalars().all()
            print(f"Bazadagi jami o'quvchilar soni: {len(students)}")
            seen_db = defaultdict(list)
            for s in students:
                fn = normalize_name(s.first_name)
                ln = normalize_name(s.last_name or "")
                key = f"{ln} {fn}".strip()
                seen_db[key].append(s)
            
            db_dupes = {k: v for k, v in seen_db.items() if len(v) > 1}
            if db_dupes:
                print(f"Bazada {len(db_dupes)} ta dublikat topildi:")
                for name, slist in db_dupes.items():
                    ids = [s.id for s in slist]
                    print(f"  Ism-familya: '{name}', ID lar: {ids}")
            else:
                print("Bazada dublikatlar topilmadi.")
    except Exception as e:
        print(f"Bazaga to'g'ridan-to'g'ri ulanish imkoni bo'lmadi: {e}")
        print("Server Dockerda bo'lsa: docker exec -it course_bot_app python scripts/dedupe_check.py")

if __name__ == "__main__":
    asyncio.run(check_duplicates())
