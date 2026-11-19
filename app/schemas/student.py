from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(default="", max_length=100)
    grade: Optional[str] = Field(default=None, max_length=50)


class StudentCreate(StudentBase):
    pass


class StudentUpdate(StudentBase):
    pass


class StudentResponse(StudentBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
