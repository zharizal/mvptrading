"""Repository for lessons."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Lesson
from app.domain.lesson import LessonRead


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _decode_list(raw: Optional[str]) -> Optional[list[str]]:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else None
    except (json.JSONDecodeError, TypeError):
        return None


def row_to_read(row: Lesson) -> LessonRead:
    return LessonRead(
        id=row.id,
        period_start=row.period_start,
        period_end=row.period_end,
        trade_count=row.trade_count,
        win_rate=row.win_rate,
        net_r=row.net_r,
        summary=row.summary,
        strengths=_decode_list(row.strengths),
        weaknesses=_decode_list(row.weaknesses),
        patterns=_decode_list(row.patterns),
        recommendations=_decode_list(row.recommendations),
        model_used=row.model_used,
        created_at=_ensure_aware(row.created_at) if row.created_at else _utcnow(),
    )


def list_lessons(db: Session, limit: int = 10) -> list[LessonRead]:
    stmt = select(Lesson).order_by(Lesson.created_at.desc()).limit(limit)
    return [row_to_read(r) for r in db.execute(stmt).scalars().all()]


def get_lesson(db: Session, lesson_id: int) -> Optional[LessonRead]:
    row = db.get(Lesson, lesson_id)
    return row_to_read(row) if row else None
