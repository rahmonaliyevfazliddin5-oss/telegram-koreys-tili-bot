from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PortalStudentRankItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rank: int
    first_name: str
    last_name: Optional[str] = None
    grade: Optional[str] = None
    total_score: int
    daily_score: int
    exam_score: int


class PortalLeaderboardResponse(BaseModel):
    students: List[PortalStudentRankItem]
    total_students: int
    updated_at: str


class PortalAttendanceStudent(BaseModel):
    id: int
    name: str
    grade: Optional[str] = None
    status: str  # present, late, absent
    late_minutes: Optional[int] = None


class PortalLessonAttendance(BaseModel):
    lesson_no: int
    is_started: bool
    topic: Optional[str] = None
    attended_count: int = 0
    late_count: int = 0
    absent_count: int = 0
    students: List[PortalAttendanceStudent] = []


class PortalAttendanceResponse(BaseModel):
    date: str
    is_weekend: bool
    lesson_1: PortalLessonAttendance
    lesson_2: PortalLessonAttendance


class PortalStudentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: Optional[str] = None
    grade: Optional[str] = None
    rank: Optional[int] = None
    total_score: int = 0
    absences_count: int = 0
    lates_count: int = 0


class PortalStudentsResponse(BaseModel):
    items: List[PortalStudentListItem]
    total: int


class PortalGradeItem(BaseModel):
    date: str
    lesson_no: int
    value: int


class PortalExamItem(BaseModel):
    date: str
    name: str
    score: int


class PortalTeacherNote(BaseModel):
    date: str
    lesson_no: int
    topic: Optional[str] = None
    homework: str


class PortalStudentDetailResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    grade: Optional[str] = None
    rank: Optional[int] = None
    total_score: int = 0
    daily_score: int = 0
    exam_score: int = 0
    absences_count: int = 0
    lates_count: int = 0
    total_teacher_lessons: int = 0
    attended_lessons_count: int = 0
    recent_grades: List[PortalGradeItem] = []
    recent_exams: List[PortalExamItem] = []
    teacher_notes: List[PortalTeacherNote] = []


class PortalTeacherResponse(BaseModel):
    name: str
    directions: str
    prep: str
    location: str
    phone: str
    total_lessons: int
    total_exams: int
