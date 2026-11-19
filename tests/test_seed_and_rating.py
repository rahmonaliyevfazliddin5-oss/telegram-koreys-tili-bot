import pytest
import asyncio
import json
import os
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.base import Base
from app.models.student import Student
from app.models.grade import Grade
from app.services.rating_service import calculate_and_cache_rating


@pytest.mark.asyncio
async def test_seed_students_idempotency_and_rating():
    # Use in-memory SQLite database
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Load seed data
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "students_seed.json")
    with open(json_path, "r", encoding="utf-8") as f:
        students_data = json.load(f)

    # 2. First seed run
    async with async_session() as session:
        async with session.begin():
            to_add = [
                Student(
                    first_name=item["first_name"],
                    last_name=item.get("last_name") or "",
                    grade=None
                )
                for item in students_data
            ]
            session.add_all(to_add)

    # Verify 46 students inserted
    async with async_session() as session:
        from sqlalchemy import select, func
        count_res = await session.execute(select(func.count(Student.id)))
        assert count_res.scalar() == 46

    # 3. Second seed run (Idempotency check)
    added_second_run = 0
    skipped_second_run = 0
    async with async_session() as session:
        async with session.begin():
            existing = await session.execute(select(Student.last_name, Student.first_name))
            existing_set = {(r[0] or "", r[1]) for r in existing.all()}

            for item in students_data:
                key = (item.get("last_name") or "", item["first_name"])
                if key in existing_set:
                    skipped_second_run += 1
                else:
                    added_second_run += 1

    assert added_second_run == 0
    assert skipped_second_run == 46

    # 4. Rating calculation check (All 46 have 0 score, no errors)
    async with async_session() as session:
        with patch("app.services.rating_service.get_cached_rating", return_value=None), \
             patch("app.services.rating_service.set_cached_rating", new_callable=AsyncMock):
            ratings = await calculate_and_cache_rating(session)
            assert len(ratings) == 46
            # All have total_score == 0
            for r in ratings:
                assert r["total_score"] == 0
                assert r["rank"] == 1  # All tied at rank 1

    await engine.dispose()
