"""API Router for Analytics reports."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.domain.reports import (
    AccuracyReport,
    MarketStatsReport,
    PerformanceReport,
    Period,
    SessionsReport,
)
from app.services.reports import accuracy, market_stats, performance, sessions

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/performance", response_model=PerformanceReport)
def get_performance(
    period: Period = Query(default="all"),
    db: Session = Depends(get_db),
) -> PerformanceReport:
    return performance.build_performance(db, period)


@router.get("/accuracy", response_model=AccuracyReport)
def get_accuracy(
    period: Period = Query(default="all"),
    symbol: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> AccuracyReport:
    return accuracy.build_accuracy(db, period, symbol=symbol)


@router.get("/market-stats", response_model=MarketStatsReport)
def get_market_stats(
    db: Session = Depends(get_db),
) -> MarketStatsReport:
    return market_stats.build_market_stats(db)


@router.get("/sessions", response_model=SessionsReport)
def get_sessions(
    period: Period = Query(default="all"),
    db: Session = Depends(get_db),
) -> SessionsReport:
    return sessions.build_sessions(db, period)
