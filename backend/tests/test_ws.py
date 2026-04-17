from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.routers import ws as ws_router
from app.schemas import SnapshotResponse, SignalState


def test_market_ws_sends_live_snapshot_payload(monkeypatch):
    client = TestClient(app)
    live_snapshot = SnapshotResponse(
        symbol="BTCUSDT",
        requested_symbol="BTCUSDT",
        resolved_symbol="BTCUSDT",
        symbol_mode="live",
        supports_symbol_switching=True,
        price=81555.25,
        change_24h_pct=1.7,
        high_24h=82000.0,
        low_24h=79000.0,
        pivot=80851.75,
        atr_14_pct=1.1,
        support=80600.0,
        resistance=82000.0,
        zone_context="BREAKOUT",
        momentum_direction="BULLISH",
        momentum_strength="STRONG",
        momentum_change_pct=1.6,
        bias="BULLISH",
        score=79,
        signal=SignalState(
            direction="BUY",
            entry=81400.0,
            stop_loss=80600.0,
            take_profit=83000.0,
            risk_reward=2.0,
            status="LIVE_FEED",
        ),
        reasoning="Live websocket snapshot ready.",
        updated_at=datetime(2026, 4, 16, 21, 0, tzinfo=timezone.utc),
    )

    monkeypatch.setattr(ws_router, "get_live_market_snapshot", lambda symbol: live_snapshot)

    with client.websocket_connect("/ws/market") as websocket:
        payload = websocket.receive_json()

    assert payload["symbol"] == "BTCUSDT"
    assert payload["requested_symbol"] == "BTCUSDT"
    assert payload["resolved_symbol"] == "BTCUSDT"
    assert payload["symbol_mode"] == "live"
    assert payload["supports_symbol_switching"] is True
    assert payload["price"] == 81555.25
    assert payload["signal"]["status"] == "LIVE_FEED"


def test_market_ws_accepts_symbol_override(monkeypatch):
    client = TestClient(app)
    requested_symbols: list[str] = []

    def fake_feed(symbol: str):
        requested_symbols.append(symbol)
        return SnapshotResponse(
            symbol="ETHUSDT",
            requested_symbol=symbol,
            resolved_symbol="ETHUSDT",
            symbol_mode="live",
            supports_symbol_switching=True,
            price=3520.5,
            change_24h_pct=0.9,
            high_24h=3600.0,
            low_24h=3450.0,
            pivot=3523.5,
            atr_14_pct=1.0,
            support=3485.0,
            resistance=3568.0,
            zone_context="MID_RANGE",
            momentum_direction="BULLISH",
            momentum_strength="WEAK",
            momentum_change_pct=0.42,
            bias="BULLISH",
            score=65,
            signal=SignalState(
                direction="WAIT",
                entry=3520.5,
                stop_loss=3485.0,
                take_profit=3568.0,
                risk_reward=1.35,
                status="WAIT_CONFIRMATION",
            ),
            reasoning="ETH websocket snapshot ready.",
            updated_at=datetime(2026, 4, 17, 12, 5, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(ws_router, "get_live_market_snapshot", fake_feed)

    with client.websocket_connect("/ws/market?symbol=ETHUSDT") as websocket:
        payload = websocket.receive_json()

    assert requested_symbols == ["ETHUSDT"]
    assert payload["requested_symbol"] == "ETHUSDT"
    assert payload["resolved_symbol"] == "ETHUSDT"
    assert payload["symbol_mode"] == "live"



def test_market_ws_fallback_preserves_requested_symbol_metadata(monkeypatch):
    client = TestClient(app)

    def broken_feed(symbol: str):
        raise RuntimeError("websocket feed down")

    monkeypatch.setattr(ws_router, "get_live_market_snapshot", broken_feed)

    with client.websocket_connect("/ws/market?symbol=ETHUSDT") as websocket:
        payload = websocket.receive_json()

    assert payload["requested_symbol"] == "ETHUSDT"
    assert payload["resolved_symbol"] == "ETHUSDT"
    assert payload["symbol_mode"] == "fallback"
    assert payload["supports_symbol_switching"] is True



def test_market_ws_falls_back_when_live_feed_fails(monkeypatch):
    client = TestClient(app)

    def broken_feed(symbol: str):
        raise RuntimeError("websocket feed down")

    monkeypatch.setattr(ws_router, "get_live_market_snapshot", broken_feed)

    with client.websocket_connect("/ws/market") as websocket:
        payload = websocket.receive_json()

    assert payload["symbol"] == "BTCUSDT"
    assert payload["requested_symbol"] == "BTCUSDT"
    assert payload["resolved_symbol"] == "BTCUSDT"
    assert payload["symbol_mode"] == "fallback"
    assert payload["supports_symbol_switching"] is True
    assert payload["signal"]["status"] == "WAIT_CONFIRMATION"
