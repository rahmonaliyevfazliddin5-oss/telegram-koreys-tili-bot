from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
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


class LedgerItem(BaseModel):
    id: int
    type: str
    amount: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StudentStats(BaseModel):
    total_absences: int = 0
    total_score: int = 0
    total_debt: int = 0


class StudentProfileResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = ""
    grade: Optional[str] = None
    total_absences: int = 0
    total_score: int = 0
    total_debt: int = 0
    student: Dict[str, Any]
    stats: StudentStats
    history: List[LedgerItem] = Field(default_factory=list)


class FineCreate(BaseModel):
    amount: Optional[int] = Field(10000, gt=0, description="Jarima summasi")


class CollectCreate(BaseModel):
    amount: int = Field(..., gt=0, description="Undirilayotgan summa")


class LedgerResponse(BaseModel):
    ok: bool = True
    student_id: int
    type: str
    amount: int
    total_debt: int
    stats: Optional[Dict[str, Any]] = None
