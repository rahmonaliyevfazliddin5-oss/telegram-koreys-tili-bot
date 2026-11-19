from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel


class AttendanceUpdate(BaseModel):
    student_id: int
    date: date
    status: Optional[Literal["present", "absent"]] = None


class AttendanceStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    status: Optional[str] = None
