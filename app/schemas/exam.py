from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, model_validator


class ExamCreateRequest(BaseModel):
    lesson_no: int = Field(..., ge=1, le=2)
    name: str = Field(..., min_length=2, max_length=100)
    topic: str = Field(..., min_length=3, max_length=300)


class ExamUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    topic: Optional[str] = Field(None, min_length=3, max_length=300)


class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    date: date
    lesson_no: int
    name: str
    topic: str
    created_at: datetime


class ExamGradeItem(BaseModel):
    student_id: int
    value: Optional[int] = Field(None, ge=1, le=5)
    modifier: Optional[str] = Field(None, pattern="^(plus|minus)$")

    @model_validator(mode="after")
    def validate_modifier(self):
        if self.value is None and self.modifier is not None:
            raise ValueError("Baho belgilanmagan holda modifikator kiritilishi mumkin emas")
        return self


class ExamGradeStudentResponse(BaseModel):
    student_id: int
    student_name: str
    value: Optional[int] = None
    modifier: Optional[str] = None


class ExamGradesBulkRequest(BaseModel):
    items: List[ExamGradeItem]
