from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


class GradeItem(BaseModel):
    student_id: int
    status: Optional[Literal["present", "absent", "late"]] = None
    value: Optional[int] = Field(None, ge=1, le=5)
    late_minutes: Optional[int] = None


class GradesBulkUpdate(BaseModel):
    date: date
    lesson: int = Field(1, ge=1, le=2)
    kind: Optional[str] = "daily"
    grades: Optional[List[GradeItem]] = None
    items: Optional[List[GradeItem]] = None

    @model_validator(mode="after")
    def unify_items(self):
        if self.items is None:
            self.items = self.grades or []
        return self


class GradeCreate(BaseModel):
    student_id: int
    date: date
    lesson: int = Field(1, ge=1, le=2)
    value: int = Field(..., ge=1, le=5)
    kind: Optional[str] = "daily"


class GradeUpdate(BaseModel):
    value: int = Field(..., ge=1, le=5)


class GradeResponse(BaseModel):
    id: Optional[int] = None
    student_id: int
    date: date
    lesson: int = 1
    value: int
    created_at: datetime
    student_name: Optional[str] = None
    kind: Optional[str] = "daily"
    model_config = ConfigDict(from_attributes=True)


class GradeStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    value: Optional[int] = None
    grade_id: Optional[int] = None
