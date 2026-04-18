"""Pydantic schemas for analytics endpoints."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


Period = Literal["7d", "30d", "90d", "all"]


# ---------- Performance (from Trade) ---------- #

class SymbolPerformance(BaseModel):
    symbol: str
    trade_count: int
    win_count: int
    win_rate: float
    net_pnl: float
    net_r: Optional[float] = None


class PerformanceReport(BaseModel):
    period: Period
    total_trades: int
    open_trades: int
    closed_trades: int
    win_count: int
    loss_count: int
    breakeven_count: int
    win_rate: float
    gross_profit: float
    gross_loss: float
    net_pnl: float
    avg_pnl: float
    profit_factor: Optional[float]
    best_r: Optional[float]
    worst_r: Optional[float]
    avg_r: Optional[float]
    expectancy_r: Optional[float]
    max_drawdown: float
    per_symbol: list[SymbolPerformance]


# ---------- Accuracy (from SignalEvent) ---------- #

class SymbolAccuracy(BaseModel):
    symbol: str
    total: int
    hit_tp: int
    hit_sl: int
    expired: int
    pending: int
    hit_rate: Optional[float]      # tp / (tp + sl), None when neither resolved
    avg_time_to_resolve_s: Optional[float]


class AccuracyReport(BaseModel):
    period: Period
    total_signals: int
    hit_tp: int
    hit_sl: int
    expired: int
    pending: int
    hit_rate: Optional[float]
    buy_hit_rate: Optional[float]
    sell_hit_rate: Optional[float]
    avg_time_to_resolve_s: Optional[float]
    per_symbol: list[SymbolAccuracy]


# ---------- Market stats (live, cross-symbol) ---------- #

class MarketStatRow(BaseModel):
    symbol: str
    asset_class: str
    price: float
    change_24h_pct: float
    atr_14_pct: float
    bias: str
    score: int
    zone_context: str


class MarketStatsReport(BaseModel):
    symbols: list[MarketStatRow]
    top_gainers: list[MarketStatRow]
    top_losers: list[MarketStatRow]
    most_volatile: list[MarketStatRow]
    bias_distribution: dict[str, int]


# ---------- Sessions (time-of-day PnL) ---------- #

class SessionBucket(BaseModel):
    session: Literal["asia", "london", "ny", "off"]
    trade_count: int
    win_count: int
    win_rate: float
    net_pnl: float
    avg_r: Optional[float]


class HourBucket(BaseModel):
    hour: int                      # 0..23 UTC
    trade_count: int
    net_pnl: float
    win_rate: float


class SessionsReport(BaseModel):
    period: Period
    sessions: list[SessionBucket]
    hours: list[HourBucket]        # length 24, UTC
