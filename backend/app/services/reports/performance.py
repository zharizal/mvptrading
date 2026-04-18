"""Trade performance aggregation from the `trades` table."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Trade
from app.domain.reports import PerformanceReport, Period, SymbolPerformance


def _period_cutoff(period: Period) -> Optional[datetime]:
    if period == "all":
        return None
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    return datetime.now(timezone.utc) - timedelta(days=days)


def _safe_div(a: float, b: float) -> Optional[float]:
    return a / b if b else None


def _max_drawdown(pnls_ordered: list[float]) -> float:
    peak = 0.0
    cum = 0.0
    max_dd = 0.0
    for p in pnls_ordered:
        cum += p
        if cum > peak:
            peak = cum
        drawdown = peak - cum
        if drawdown > max_dd:
            max_dd = drawdown
    return max_dd


def build_performance(db: Session, period: Period) -> PerformanceReport:
    cutoff = _period_cutoff(period)
    stmt = select(Trade).order_by(Trade.entry_time.asc())
    if cutoff is not None:
        stmt = stmt.where(Trade.entry_time >= cutoff)
    trades = list(db.execute(stmt).scalars().all())

    closed = [t for t in trades if t.exit_price is not None]
    open_trades = [t for t in trades if t.exit_price is None]

    wins = [t for t in closed if (t.pnl or 0) > 0]
    losses = [t for t in closed if (t.pnl or 0) < 0]
    breakevens = [t for t in closed if (t.pnl or 0) == 0]

    gross_profit = sum((t.pnl or 0) for t in wins)
    gross_loss = sum(abs(t.pnl or 0) for t in losses)
    net_pnl = sum((t.pnl or 0) for t in closed)

    closed_count = len(closed)
    rs = [t.r_multiple for t in closed if t.r_multiple is not None]
    pnls_ordered = [t.pnl or 0 for t in sorted(closed, key=lambda x: x.exit_time or datetime.min.replace(tzinfo=timezone.utc))]

    # Per-symbol breakdown
    by_symbol: dict[str, list[Trade]] = {}
    for t in closed:
        by_symbol.setdefault(t.symbol, []).append(t)
    per_symbol: list[SymbolPerformance] = []
    for sym, trs in by_symbol.items():
        sym_wins = [t for t in trs if (t.pnl or 0) > 0]
        sym_rs = [t.r_multiple for t in trs if t.r_multiple is not None]
        per_symbol.append(SymbolPerformance(
            symbol=sym,
            trade_count=len(trs),
            win_count=len(sym_wins),
            win_rate=len(sym_wins) / len(trs) * 100 if trs else 0.0,
            net_pnl=sum((t.pnl or 0) for t in trs),
            net_r=sum(sym_rs) if sym_rs else None,
        ))
    per_symbol.sort(key=lambda x: x.net_pnl, reverse=True)

    return PerformanceReport(
        period=period,
        total_trades=len(trades),
        open_trades=len(open_trades),
        closed_trades=closed_count,
        win_count=len(wins),
        loss_count=len(losses),
        breakeven_count=len(breakevens),
        win_rate=(len(wins) / closed_count * 100) if closed_count else 0.0,
        gross_profit=gross_profit,
        gross_loss=gross_loss,
        net_pnl=net_pnl,
        avg_pnl=(net_pnl / closed_count) if closed_count else 0.0,
        profit_factor=_safe_div(gross_profit, gross_loss),
        best_r=max(rs) if rs else None,
        worst_r=min(rs) if rs else None,
        avg_r=(sum(rs) / len(rs)) if rs else None,
        expectancy_r=(sum(rs) / len(rs)) if rs else None,
        max_drawdown=_max_drawdown(pnls_ordered),
        per_symbol=per_symbol,
    )
