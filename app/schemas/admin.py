from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class AdminPasswordChange(BaseModel):
    old_password: str = Field(..., min_length=1, description="Eski parol")
    new_password: str = Field(..., min_length=4, description="Yangi parol (kamida 4 belgi)")
    confirm_password: Optional[str] = Field(None, description="Yangi parolni tasdiqlash")


class LessonWindowInfo(BaseModel):
    lesson: int
    time: str
    window_start: str
    window_end: str
    is_open: bool
    is_started: bool = False
    topic: Optional[str] = None
    lesson_id: Optional[int] = None


class StatusResponse(BaseModel):
    server_time: str
    date: str
    current_time: str
    is_weekend: bool
    is_rest_day: Optional[bool] = None
    weekday_name: Optional[str] = None
    active_lesson: Optional[int] = None
    lesson1_open: bool
    lesson2_open: bool
    is_any_window_open: bool
    lesson_1: LessonWindowInfo
    lesson_2: LessonWindowInfo
    exams: List[Dict[str, Any]] = []
    is_blocked: bool = False
    block_ttl: int = 0
