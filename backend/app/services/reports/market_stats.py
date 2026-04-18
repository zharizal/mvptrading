"""Cross-symbol live market stats — reads from the poller's latest cache.

Only symbols that currently have a subscriber (i.e. actively streaming)
contribute data. This keeps the endpoint cheap and avoids hammering the
data providers.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import Symbol
from app.domain.reports import MarketStatRow, MarketStatsReport
from app.services.market_poller import registry as poller_registry


def _symbol_asset_class(db: Session, canonical: str) -> str:
    row = db.get(Symbol, canonical)
    if row is not None:
        return row.asset_class
    # Legacy BTCUSDT / unknown → default to crypto
    return "crypto"


def build_market_stats(db: Session) -> MarketStatsReport:
    rows: list[MarketStatRow] = []
    for symbol, poller in poller_registry._pollers.items():  # internal access OK here
        snap = poller.latest
        if snap is None:
            continue
        rows.append(MarketStatRow(
            symbol=snap.resolved_symbol,
            asset_class=_symbol_asset_class(db, snap.resolved_symbol),
            price=snap.price,
            change_24h_pct=snap.change_24h_pct,
            atr_14_pct=snap.atr_14_pct,
            bias=snap.bias,
            score=snap.score,
            zone_context=snap.zone_context,
        ))

    # Sort for ranks
    by_gain = sorted(rows, key=lambda r: r.change_24h_pct, reverse=True)
    by_lose = sorted(rows, key=lambda r: r.change_24h_pct)
    by_vol = sorted(rows, key=lambda r: r.atr_14_pct, reverse=True)

    bias_dist: dict[str, int] = {}
    for r in rows:
        bias_dist[r.bias] = bias_dist.get(r.bias, 0) + 1

    return MarketStatsReport(
        symbols=rows,
        top_gainers=by_gain[:5],
        top_losers=by_lose[:5],
        most_volatile=by_vol[:5],
        bias_distribution=bias_dist,
    )
