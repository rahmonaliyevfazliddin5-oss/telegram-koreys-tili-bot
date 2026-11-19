from typing import List, Dict, Any, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.grade import Grade
from app.services.cache_service import get_cached_rating, set_cached_rating


async def calculate_and_cache_rating(session: AsyncSession) -> List[Dict[str, Any]]:
    # Keshda bo'lsa keshdan olamiz
    cached = await get_cached_rating()
    if cached is not None:
        return cached

    # Bazadan hisoblash
    stmt = (
        select(
            Student.id,
            Student.first_name,
            Student.last_name,
            Student.grade,
            func.coalesce(func.sum(Grade.value), 0).label("total_score")
        )
        .outerjoin(Grade, Student.id == Grade.student_id)
        .group_by(Student.id, Student.first_name, Student.last_name, Student.grade)
        .order_by(func.coalesce(func.sum(Grade.value), 0).desc(), Student.last_name.asc(), Student.first_name.asc())
    )
    result = await session.execute(stmt)
    rows = result.all()

    rating_list = []
    current_rank = 0
    previous_score = None

    for idx, row in enumerate(rows):
        score = int(row.total_score)
        if score != previous_score:
            current_rank = idx + 1  # Teng ball bo'lsa bir xil o'rin
            previous_score = score

        rating_list.append({
            "rank": current_rank,
            "id": row.id,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "grade": row.grade,
            "total_score": score
        })

    await set_cached_rating(rating_list)
    return rating_list


def paginate_rating(
    rating_list: List[Dict[str, Any]],
    page: int = 1,
    page_size: int = 10
) -> Tuple[List[Dict[str, Any]], int]:
    total_items = len(rating_list)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    items = rating_list[start_idx:end_idx]
    return items, total_pages
