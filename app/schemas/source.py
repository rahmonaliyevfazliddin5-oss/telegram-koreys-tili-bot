from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    text: str = Field(..., min_length=1)
    source_lang: str = Field("uz", pattern="^(uz|en|ru)$")


class SourceUpdate(BaseModel):
    title_uz: str = Field(..., min_length=1, max_length=255)
    title_en: str = Field(..., min_length=1, max_length=255)
    title_ru: str = Field(..., min_length=1, max_length=255)
    text_uz: str = Field(..., min_length=1)
    text_en: str = Field(..., min_length=1)
    text_ru: str = Field(..., min_length=1)
    position: Optional[int] = 0


class SourceResponse(BaseModel):
    id: int
    title_uz: str
    title_en: str
    title_ru: str
    text_uz: str
    text_en: str
    text_ru: str
    position: int
    created_at: datetime

    class Config:
        from_attributes = True
