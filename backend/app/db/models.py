"""SQLAlchemy ORM models for the trading terminal.

Tables:
- symbols:       master catalog of tradable instruments (seeded on startup)
- trades:        user journal entries
- signal_events: auto-logged signals from the market pipeline + outcome tracking
- lessons:       AI-generated weekly/periodic reviews
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Symbol(Base):
    __tablename__ = "symbols"

    canonical_symbol = Column(String, primary_key=True)      # 'BTC/USDT'
    display_name = Column(String, nullable=False)             # 'Bitcoin / Tether'
    asset_class = Column(String, nullable=False, index=True)  # 'crypto'|'forex'|'commodity'
    provider = Column(String, nullable=False)                 # 'binance'|'twelvedata'
    base_ccy = Column(String, nullable=False)
    quote_ccy = Column(String, nullable=False)
    pip_size = Column(Float, nullable=True)
    tradingview_symbol = Column(String, nullable=True)        # 'BINANCE:BTCUSDT'
    enabled = Column(Integer, nullable=False, default=1)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    direction = Column(String, nullable=False)          # 'BUY'|'SELL'
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)           # NULL = still open
    size = Column(Float, nullable=False)                # quote-currency size
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    entry_time = Column(DateTime(timezone=True), nullable=False, index=True)
    exit_time = Column(DateTime(timezone=True), nullable=True)
    pnl = Column(Float, nullable=True)                  # computed on close
    r_multiple = Column(Float, nullable=True)           # (exit-entry)/(entry-sl) signed by direction
    notes = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)                  # JSON-encoded array
    setup_quality = Column(Integer, nullable=True)      # 1..5 self-rating
    emotion = Column(String, nullable=True)             # 'confident'|'fomo'|'revenge'|'fear'|'neutral'
    screenshot_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class SignalEvent(Base):
    __tablename__ = "signal_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False)
    direction = Column(String, nullable=False)          # 'BUY'|'SELL' — WAIT not logged
    price_at_signal = Column(Float, nullable=False)
    entry = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=False)
    zone_context = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    bias = Column(String, nullable=True)
    outcome = Column(String, nullable=False, default="pending")  # pending|hit_tp|hit_sl|expired
    outcome_price = Column(Float, nullable=True)
    outcome_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, index=True)

    __table_args__ = (
        Index("idx_signal_events_symbol_time", "symbol", "created_at"),
        Index("idx_signal_events_outcome", "outcome"),
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period_start = Column(String, nullable=False)       # 'YYYY-MM-DD'
    period_end = Column(String, nullable=False, index=True)
    trade_count = Column(Integer, nullable=True)
    win_rate = Column(Float, nullable=True)
    net_r = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)             # JSON array
    weaknesses = Column(Text, nullable=True)            # JSON array
    patterns = Column(Text, nullable=True)              # JSON
    recommendations = Column(Text, nullable=True)       # JSON
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
