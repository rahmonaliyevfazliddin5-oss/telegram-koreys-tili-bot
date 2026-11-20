from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


class GradeItem(BaseModel):
    student_id: int
    value: Optional[int] = Field(None, ge=1, le=5)


class GradesBulkUpdate(BaseModel):
    date: date
    lesson: int = Field(1, ge=1, le=2)
    kind: Literal["daily", "exam"] = "daily"
    grades: List[GradeItem] = Field(default_factory=list)


class GradeCreate(BaseModel):
    student_id: int
    date: date
    lesson: int = Field(1, ge=1, le=2)
    kind: Literal["daily", "exam"] = "daily"
    value: int = Field(..., ge=1, le=5)


class GradeUpdate(BaseModel):
    value: int = Field(..., ge=1, le=5)


class GradeResponse(BaseModel):
    id: int
    student_id: int
    date: date
    lesson: int = 1
    kind: str = "daily"
    value: int
    created_at: datetime
    student_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class GradeStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    value: Optional[int] = None
    grade_id: Optional[int] = None
