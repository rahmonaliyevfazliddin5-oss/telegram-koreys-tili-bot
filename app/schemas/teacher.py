from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class TeacherLessonItem(BaseModel):
    lesson_no: int
    time: str
    topic: str
    display: str
    attended_count: int = 0
    graded_count: int = 0
    absent_count: int = 0
    homework: Optional[str] = None


class TeacherDayCard(BaseModel):
    date: str
    date_formatted: str
    weekday_name: str
    has_lessons: bool
    lessons: List[TeacherLessonItem] = Field(default_factory=list)
    empty_text: Optional[str] = None


class TeacherExamCard(BaseModel):
    id: int
    date: str
    date_formatted: str
    lesson_no: int
    name: str
    topic: str
    attended_count: int = 0
    avg_score: Optional[float] = None


class TeacherProfileResponse(BaseModel):
    total_lessons: int
    total_exams: int
    current_month: str
    month_name: str
    workdays: List[TeacherDayCard] = Field(default_factory=list)
    exams: List[TeacherExamCard] = Field(default_factory=list)
