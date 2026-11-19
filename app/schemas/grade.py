from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class GradeCreate(BaseModel):
    student_id: int
    date: date
    value: int = Field(..., ge=1, le=5)


class GradeUpdate(BaseModel):
    value: int = Field(..., ge=1, le=5)


class GradeResponse(BaseModel):
    id: int
    student_id: int
    date: date
    value: int
    created_at: datetime
    student_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
