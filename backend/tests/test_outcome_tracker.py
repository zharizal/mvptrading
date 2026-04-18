from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, SignalEvent
from app.services.reports import outcome_tracker


def _make_session_factory(tmp_path):
    db_file = tmp_path / "tracker-test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        future=True,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_resolve_pending_marks_hit_tp(tmp_path, monkeypatch):
    session_local = _make_session_factory(tmp_path)
    monkeypatch.setattr(outcome_tracker, "SessionLocal", session_local)
    monkeypatch.setattr(
        outcome_tracker,
        "get_live_market_snapshot",
        lambda symbol: SimpleNamespace(price=105.0),
    )

    with session_local() as db:
        db.add(
            SignalEvent(
                symbol="BTCUSDT",
                direction="BUY",
                price_at_signal=100.0,
                entry=100.0,
                stop_loss=95.0,
                take_profit=104.0,
                zone_context="SUPPORT",
                score=80,
                bias="BULLISH",
                outcome="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    outcome_tracker._resolve_pending()

    with session_local() as db:
        row = db.execute(select(SignalEvent)).scalar_one()
        assert row.outcome == "hit_tp"
        assert row.outcome_price == 105.0
        assert row.outcome_at is not None


@pytest.mark.asyncio
async def test_run_tracker_invokes_resolver_once_before_cancel(monkeypatch):
    calls = {"count": 0}
    sleeps = {"count": 0}

    def fake_resolve_pending() -> None:
        calls["count"] += 1

    async def fake_sleep(_interval: float) -> None:
        sleeps["count"] += 1
        if sleeps["count"] > 1:
            raise asyncio.CancelledError

    monkeypatch.setattr(outcome_tracker, "_resolve_pending", fake_resolve_pending)
    monkeypatch.setattr(outcome_tracker.asyncio, "sleep", fake_sleep)

    await outcome_tracker.run_tracker(interval=0)

    assert calls["count"] == 1
