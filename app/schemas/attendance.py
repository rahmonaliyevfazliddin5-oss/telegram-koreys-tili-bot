from datetime import date, datetime
from typing import Optional, List, Literal, Union
from pydantic import BaseModel, Field, model_validator


def format_late_display(minutes: Optional[int]) -> Optional[str]:
    if minutes is None or minutes <= 0:
        return None
    if minutes < 60:
        return f"+{minutes} daqiqa kech qoldi"
    hours = minutes // 60
    rem = minutes % 60
    if rem == 0:
        return f"+{hours} soat kech qoldi"
    return f"+{hours} soat {rem} daqiqa kech qoldi"


class LateStudentItem(BaseModel):
    student_id: int
    minutes: int = Field(..., ge=1, le=600)


class AttendanceUpdate(BaseModel):
    student_id: Optional[int] = None
    date: date
    lesson: int = Field(1, ge=1, le=2)
    status: Optional[Literal["present", "absent", "late"]] = None
    late_minutes: Optional[int] = Field(None, ge=1, le=600)
    absences: Optional[List[int]] = None
    absent_ids: Optional[List[int]] = None
    absent_student_ids: Optional[List[int]] = None
    late: Optional[List[LateStudentItem]] = None


class AttendanceSessionUpdate(BaseModel):
    date: date
    lesson: int = Field(1, ge=1, le=2)
    absent_ids: Optional[List[int]] = None
    absences: Optional[List[int]] = None
    absent_student_ids: Optional[List[int]] = None
    late: Optional[List[LateStudentItem]] = None

    @model_validator(mode="after")
    def unify_absents(self):
        if self.absent_ids is None:
            if self.absences is not None:
                self.absent_ids = self.absences
            elif self.absent_student_ids is not None:
                self.absent_ids = self.absent_student_ids
            else:
                self.absent_ids = []
        if self.late is None:
            self.late = []
        return self


class AttendanceStudentItem(BaseModel):
    student_id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    is_absent: bool = False
    status: str = "present"  # "present" | "absent" | "late"
    late_minutes: Optional[int] = None
    late_formatted: Optional[str] = None


class AttendanceSessionResponse(BaseModel):
    date: date
    lesson: int
    is_saved: bool
    saved_at: Optional[datetime] = None
    window_open: bool
    is_started: bool = False
    topic: Optional[str] = None
    total_students: int
    absent_count: int
    late_count: int = 0
    present_count: int
    percentage: float = 100.0
    absent_ids: List[int] = Field(default_factory=list)
    late: List[LateStudentItem] = Field(default_factory=list)
    students: List[AttendanceStudentItem] = Field(default_factory=list)
