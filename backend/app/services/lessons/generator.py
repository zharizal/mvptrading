"""Lesson AI Generator.

Aggregates `period` trades from the journal and asks OpenRouter to review
them, producing a structured JSON review inserted into the `lessons` table.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Lesson, Trade
from app.domain.lesson import LessonRead
from app.services.lessons import repository
from app.services.llm_client import _call_openrouter
from app.services.lessons.prompts import build_lesson_prompt
from app.services.reports.sessions import _period_cutoff


def generate_lesson(db: Session, period: str) -> LessonRead:
    settings = get_settings()
    api_key = settings.openrouter_api_key
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    cutoff = _period_cutoff(period)  # type: ignore[arg-type]
    stmt = select(Trade).where(Trade.exit_price.is_not(None)).order_by(Trade.entry_time.asc())
    if cutoff is not None:
        stmt = stmt.where(Trade.entry_time >= cutoff)

    trades = list(db.execute(stmt).scalars().all())
    count = len(trades)
    if count == 0:
        raise ValueError(f"No closed trades found for period {period}")

    wins = sum(1 for t in trades if (t.pnl or 0) > 0)
    win_rate = (wins / count * 100)
    rs = [t.r_multiple for t in trades if t.r_multiple is not None]
    net_r = sum(rs) if rs else 0.0

    trades_data = [
        {
            "symbol": t.symbol,
            "dir": t.direction,
            "pnl": t.pnl,
            "R": t.r_multiple,
            "qual": t.setup_quality,
            "emo": t.emotion,
            "tags": t.tags,
            "note": t.notes,
        }
        for t in trades
    ]

    prompt = build_lesson_prompt(
        period_label=period,
        trade_count=count,
        win_rate=win_rate,
        net_r=net_r,
        trades_data=trades_data,
    )

    text = _call_openrouter(
        api_key=api_key,
        base_url=settings.openrouter_base_url,
        model=settings.llm_model,
        prompt=prompt,
        referer=settings.openrouter_referer,
        app_name=settings.openrouter_app_name,
        system="You output strictly valid JSON matching the requested schema.",
        response_format={"type": "json_object"},
        max_tokens=800,
    )
    if not text:
        raise RuntimeError("LLM request failed or returned empty")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"LLM returned invalid JSON: {text[:100]}...") from exc

    def _ensure_list(v) -> str:
        if not v:
            return "[]"
        if isinstance(v, list):
            return json.dumps([str(x) for x in v])
        return json.dumps([str(v)])

    now = datetime.now(timezone.utc)
    row = Lesson(
        period_start=cutoff.strftime("%Y-%m-%d") if cutoff else "all-time",
        period_end=now.strftime("%Y-%m-%d"),
        trade_count=count,
        win_rate=win_rate,
        net_r=net_r,
        summary=str(data.get("summary", "Review generated without summary.")),
        strengths=_ensure_list(data.get("strengths")),
        weaknesses=_ensure_list(data.get("weaknesses")),
        patterns=_ensure_list(data.get("patterns")),
        recommendations=_ensure_list(data.get("recommendations")),
        model_used=settings.llm_model,
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return repository.row_to_read(row)
