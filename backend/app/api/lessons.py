"""Lesson API endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.domain.lesson import LessonGenerateRequest, LessonRead
from app.services.lessons import generator, repository

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("", response_model=list[LessonRead])
def list_lessons(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[LessonRead]:
    return repository.list_lessons(db, limit=limit)


@router.post("/generate", response_model=LessonRead, status_code=201)
def generate_lesson(
    payload: LessonGenerateRequest,
    db: Session = Depends(get_db),
) -> LessonRead:
    return generator.generate_lesson(db, payload.period)
