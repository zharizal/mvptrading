"""Signal accuracy aggregation from `signal_events`."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import SignalEvent
from app.domain.reports import AccuracyReport, Period, SymbolAccuracy


def _period_cutoff(period: Period) -> Optional[datetime]:
    if period == "all":
        return None
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    return datetime.now(timezone.utc) - timedelta(days=days)


def _hit_rate(tp: int, sl: int) -> Optional[float]:
    total = tp + sl
    if total == 0:
        return None
    return tp / total * 100


def _time_to_resolve(row: SignalEvent) -> Optional[float]:
    if row.outcome_at is None or row.created_at is None:
        return None
    start = row.created_at
    end = row.outcome_at
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return (end - start).total_seconds()


def build_accuracy(db: Session, period: Period, symbol: Optional[str] = None) -> AccuracyReport:
    cutoff = _period_cutoff(period)
    stmt = select(SignalEvent)
    if cutoff is not None:
        stmt = stmt.where(SignalEvent.created_at >= cutoff)
    if symbol:
        stmt = stmt.where(SignalEvent.symbol == symbol.upper())
    rows = list(db.execute(stmt).scalars().all())

    def bucket(items: list[SignalEvent]) -> dict[str, int]:
        return {
            "hit_tp": sum(1 for r in items if r.outcome == "hit_tp"),
            "hit_sl": sum(1 for r in items if r.outcome == "hit_sl"),
            "expired": sum(1 for r in items if r.outcome == "expired"),
            "pending": sum(1 for r in items if r.outcome == "pending"),
        }

    b = bucket(rows)
    buy_rows = [r for r in rows if r.direction == "BUY"]
    sell_rows = [r for r in rows if r.direction == "SELL"]
    buy_b = bucket(buy_rows)
    sell_b = bucket(sell_rows)

    resolved_times = [
        t for t in (_time_to_resolve(r) for r in rows if r.outcome in ("hit_tp", "hit_sl"))
        if t is not None
    ]

    # Per-symbol breakdown
    by_symbol: dict[str, list[SignalEvent]] = {}
    for r in rows:
        by_symbol.setdefault(r.symbol, []).append(r)
    per_symbol: list[SymbolAccuracy] = []
    for sym, items in by_symbol.items():
        bb = bucket(items)
        sym_times = [
            t for t in (_time_to_resolve(r) for r in items if r.outcome in ("hit_tp", "hit_sl"))
            if t is not None
        ]
        per_symbol.append(SymbolAccuracy(
            symbol=sym,
            total=len(items),
            hit_tp=bb["hit_tp"],
            hit_sl=bb["hit_sl"],
            expired=bb["expired"],
            pending=bb["pending"],
            hit_rate=_hit_rate(bb["hit_tp"], bb["hit_sl"]),
            avg_time_to_resolve_s=(sum(sym_times) / len(sym_times)) if sym_times else None,
        ))
    per_symbol.sort(key=lambda x: x.total, reverse=True)

    return AccuracyReport(
        period=period,
        total_signals=len(rows),
        hit_tp=b["hit_tp"],
        hit_sl=b["hit_sl"],
        expired=b["expired"],
        pending=b["pending"],
        hit_rate=_hit_rate(b["hit_tp"], b["hit_sl"]),
        buy_hit_rate=_hit_rate(buy_b["hit_tp"], buy_b["hit_sl"]),
        sell_hit_rate=_hit_rate(sell_b["hit_tp"], sell_b["hit_sl"]),
        avg_time_to_resolve_s=(sum(resolved_times) / len(resolved_times)) if resolved_times else None,
        per_symbol=per_symbol,
    )
