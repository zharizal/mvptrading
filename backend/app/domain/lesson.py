"""Lesson AI generation models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.reports import Period


class LessonRead(BaseModel):
    id: int
    period_start: str
    period_end: str
    trade_count: Optional[int]
    win_rate: Optional[float]
    net_r: Optional[float]
    summary: Optional[str]
    strengths: Optional[list[str]]
    weaknesses: Optional[list[str]]
    patterns: Optional[list[str]]
    recommendations: Optional[list[str]]
    model_used: Optional[str]
    created_at: datetime


class LessonGenerateRequest(BaseModel):
    period: Period = Field(default="7d", description="Period to analyze")
