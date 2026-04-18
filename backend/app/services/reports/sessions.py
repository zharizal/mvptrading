"""Session and time-of-day analytics from `trades` table."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Trade
from app.domain.reports import HourBucket, Period, SessionBucket, SessionsReport


def _period_cutoff(period: Period) -> Optional[datetime]:
    if period == "all":
        return None
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    return datetime.now(timezone.utc) - timedelta(days=days)


def _classify_session(dt: datetime) -> Literal["asia", "london", "ny", "off"]:
    """Rough UTC session classification (no daylight savings adjustment).

    Asia: 00:00 - 08:00 UTC
    London: 08:00 - 13:00 UTC
    NY: 13:00 - 21:00 UTC
    Off: 21:00 - 00:00 UTC
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    hour = dt.hour
    if 0 <= hour < 8:
        return "asia"
    if 8 <= hour < 13:
        return "london"
    if 13 <= hour < 21:
        return "ny"
    return "off"


def build_sessions(db: Session, period: Period) -> SessionsReport:
    cutoff = _period_cutoff(period)
    stmt = select(Trade).where(Trade.exit_price.is_not(None))
    if cutoff is not None:
        stmt = stmt.where(Trade.entry_time >= cutoff)
    rows = list(db.execute(stmt).scalars().all())

    # Build hour buckets (0-23)
    hour_map: dict[int, list[Trade]] = {h: [] for h in range(24)}
    session_map: dict[str, list[Trade]] = {"asia": [], "london": [], "ny": [], "off": []}

    for r in rows:
        dt = r.entry_time
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        hour_map[dt.hour].append(r)
        session_map[_classify_session(dt)].append(r)

    def _bucket_stats(trades: list[Trade]) -> tuple[int, int, float, float, Optional[float]]:
        count = len(trades)
        if not count:
            return 0, 0, 0.0, 0.0, None
        wins = [t for t in trades if (t.pnl or 0) > 0]
        net_pnl = sum((t.pnl or 0) for t in trades)
        rs = [t.r_multiple for t in trades if t.r_multiple is not None]
        avg_r = sum(rs) / len(rs) if rs else None
        return count, len(wins), len(wins) / count * 100, net_pnl, avg_r

    hours: list[HourBucket] = []
    for h in range(24):
        c, _, wr, pnl, _ = _bucket_stats(hour_map[h])
        hours.append(HourBucket(hour=h, trade_count=c, net_pnl=pnl, win_rate=wr))

    sessions: list[SessionBucket] = []
    for s_name in ["asia", "london", "ny", "off"]:
        c, w, wr, pnl, ar = _bucket_stats(session_map[s_name])
        sessions.append(SessionBucket(
            session=s_name,  # type: ignore[arg-type]
            trade_count=c,
            win_count=w,
            win_rate=wr,
            net_pnl=pnl,
            avg_r=ar,
        ))

    return SessionsReport(period=period, sessions=sessions, hours=hours)
