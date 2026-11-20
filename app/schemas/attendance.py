from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class AttendanceUpdate(BaseModel):
    student_id: Optional[int] = None
    date: date
    lesson: int = Field(1, ge=1, le=2)
    status: Optional[Literal["present", "absent"]] = None
    absences: Optional[List[int]] = None
    absent_student_ids: Optional[List[int]] = None


class AttendanceSessionUpdate(BaseModel):
    date: date
    lesson: int = Field(1, ge=1, le=2)
    absences: Optional[List[int]] = None
    absent_student_ids: Optional[List[int]] = None


class AttendanceStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    is_absent: bool = False
    status: Optional[str] = "present"


class AttendanceSessionResponse(BaseModel):
    date: date
    lesson: int
    is_saved: bool
    saved_at: Optional[datetime] = None
    window_open: bool
    total_students: int
    absent_count: int
    present_count: int
    percentage: float = 100.0
    absent_ids: List[int] = Field(default_factory=list)
    students: List[AttendanceStudentItem] = Field(default_factory=list)
