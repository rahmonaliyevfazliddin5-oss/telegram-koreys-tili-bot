from datetime import date as dt_date, datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


class ExamCreateRequest(BaseModel):
    date: Optional[Union[dt_date, str]] = None
    lesson_no: int = Field(..., ge=1, le=2)
    name: str = Field(..., min_length=2, max_length=100)
    topic: str = Field(..., min_length=3, max_length=300)

    @field_validator("date", mode="before")
    @classmethod
    def parse_exam_date(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, dt_date):
            return v
        if isinstance(v, str):
            clean_v = v.strip()
            if not clean_v:
                return None
            try:
                return dt_date.fromisoformat(clean_v)
            except Exception:
                # MM/DD/YYYY formatini ham tekshirib ko'rish
                try:
                    parts = clean_v.split("/")
                    if len(parts) == 3:
                        m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
                        return dt_date(y, m, d)
                except Exception:
                    pass
        return v


class ExamUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    topic: Optional[str] = Field(None, min_length=3, max_length=300)


class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    date: dt_date
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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    grade: Optional[str] = None
    value: Optional[int] = None
    modifier: Optional[str] = None


class ExamGradesBulkRequest(BaseModel):
    items: List[ExamGradeItem]
