from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class LessonStartRequest(BaseModel):
    lesson_no: int = Field(..., ge=1, le=2)
    topic: str = Field(..., min_length=3, max_length=300)


class LessonUpdateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)


class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    date: date
    lesson_no: int
    topic: str
    started_at: datetime
    updated_at: datetime
