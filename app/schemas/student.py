from datetime import datetime
from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    grade: str = Field(..., min_length=1, max_length=50)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(StudentBase):
    pass


class StudentResponse(StudentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
