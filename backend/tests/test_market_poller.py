"""Verify the single-poller fan-out broadcasts one fetched snapshot to
all subscribers of the same symbol rather than hitting Binance per-client.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest

from app.schemas import SignalState, SnapshotResponse
from app.services import market_poller


def _sample_snapshot(symbol: str = "BTCUSDT", price: float = 80000.0) -> SnapshotResponse:
    return SnapshotResponse(
        symbol=symbol,
        requested_symbol=symbol,
        resolved_symbol=symbol,
        symbol_mode="live",
        supports_symbol_switching=True,
        price=price,
        change_24h_pct=1.0,
        high_24h=price + 500,
        low_24h=price - 500,
        pivot=price,
        atr_14_pct=1.0,
        support=price - 200,
        resistance=price + 200,
        zone_context="MID_RANGE",
        momentum_direction="BULLISH",
        momentum_strength="STRONG",
        momentum_change_pct=1.0,
        bias="BULLISH",
        score=70,
        signal=SignalState(
            direction="BUY",
            entry=price,
            stop_loss=price - 100,
            take_profit=price + 200,
            risk_reward=2.0,
            status="LIVE_FEED",
        ),
        reasoning="test",
        updated_at=datetime(2026, 4, 18, 0, 0, tzinfo=timezone.utc),
    )


class _FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send_json(self, data: dict) -> None:
        self.sent.append(data)


@pytest.mark.asyncio
async def test_single_poll_broadcasts_to_all_subscribers(monkeypatch):
    fetch_count = {"n": 0}

    def fake_get_live_snapshot(symbol: str) -> SnapshotResponse:
        fetch_count["n"] += 1
        return _sample_snapshot(symbol=symbol)

    monkeypatch.setattr(
        "app.services.market_poller.get_live_market_snapshot",
        fake_get_live_snapshot,
    )

    registry = market_poller.PollerRegistry()
    ws_a = _FakeWebSocket()
    ws_b = _FakeWebSocket()
    ws_c = _FakeWebSocket()

    await registry.subscribe("BTCUSDT", ws_a)
    await registry.subscribe("BTCUSDT", ws_b)
    await registry.subscribe("BTCUSDT", ws_c)

    poller = registry._pollers["BTCUSDT"]
    # Trigger one tick directly without waiting for the 5s interval
    snapshot = await poller._fetch_snapshot()
    poller.latest = snapshot
    await poller._broadcast(snapshot)

    assert fetch_count["n"] == 1, "Binance should be fetched once regardless of subscriber count"
    assert len(ws_a.sent) == 1
    assert len(ws_b.sent) == 1
    assert len(ws_c.sent) == 1

    await registry.shutdown()


@pytest.mark.asyncio
async def test_last_unsubscriber_cancels_poller_task(monkeypatch):
    monkeypatch.setattr(
        "app.services.market_poller.get_live_market_snapshot",
        lambda symbol: _sample_snapshot(symbol=symbol),
    )

    registry = market_poller.PollerRegistry()
    ws_a = _FakeWebSocket()
    ws_b = _FakeWebSocket()

    await registry.subscribe("ETHUSDT", ws_a)
    await registry.subscribe("ETHUSDT", ws_b)
    poller = registry._pollers["ETHUSDT"]
    task = poller.task
    assert task is not None

    await registry.unsubscribe("ETHUSDT", ws_a)
    assert "ETHUSDT" in registry._pollers

    await registry.unsubscribe("ETHUSDT", ws_b)
    assert "ETHUSDT" not in registry._pollers
    # Give cancel a tick to propagate
    await asyncio.sleep(0)
    assert task.cancelled() or task.done()


@pytest.mark.asyncio
async def test_broadcast_falls_back_to_seeded_snapshot_on_fetch_failure(monkeypatch):
    def exploding(symbol: str) -> SnapshotResponse:
        raise RuntimeError("binance down")

    monkeypatch.setattr(
        "app.services.market_poller.get_live_market_snapshot",
        exploding,
    )

    registry = market_poller.PollerRegistry()
    ws = _FakeWebSocket()
    await registry.subscribe("BTCUSDT", ws)
    poller = registry._pollers["BTCUSDT"]

    snapshot = await poller._fetch_snapshot()
    await poller._broadcast(snapshot)

    assert len(ws.sent) == 1
    assert ws.sent[0]["symbol_mode"] == "fallback"

    await registry.shutdown()
