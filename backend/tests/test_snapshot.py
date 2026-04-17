from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from app.routers import snapshot as snapshot_router
from app.schemas import SnapshotResponse, SignalState


def test_snapshot_contains_required_fields_from_live_feed(monkeypatch):
    client = TestClient(app)
    live_snapshot = SnapshotResponse(
        symbol="BTCUSDT",
        requested_symbol="BTCUSDT",
        resolved_symbol="BTCUSDT",
        symbol_mode="live",
        supports_symbol_switching=True,
        price=81234.56,
        change_24h_pct=2.5,
        high_24h=82000.0,
        low_24h=79000.0,
        pivot=80744.85,
        atr_14_pct=1.2,
        support=80450.0,
        resistance=82000.0,
        zone_context="SUPPORT",
        momentum_direction="BULLISH",
        momentum_strength="STRONG",
        momentum_change_pct=2.4,
        bias="BULLISH",
        score=81,
        signal=SignalState(
            direction="BUY",
            entry=81000.0,
            stop_loss=80200.0,
            take_profit=82600.0,
            risk_reward=2.0,
            status="LIVE_FEED",
        ),
        reasoning="Live feed snapshot ready.",
        updated_at=datetime(2026, 4, 16, 20, 0, tzinfo=timezone.utc),
    )

    monkeypatch.setattr(snapshot_router, "get_live_market_snapshot", lambda symbol: live_snapshot)

    response = client.get("/snapshot")

    assert response.status_code == 200
    payload = response.json()

    required_fields = {
        "symbol",
        "requested_symbol",
        "resolved_symbol",
        "symbol_mode",
        "supports_symbol_switching",
        "price",
        "change_24h_pct",
        "high_24h",
        "low_24h",
        "pivot",
        "atr_14_pct",
        "support",
        "resistance",
        "zone_context",
        "momentum_direction",
        "momentum_strength",
        "momentum_change_pct",
        "bias",
        "score",
        "signal",
        "reasoning",
        "updated_at",
    }

    assert required_fields.issubset(payload.keys())
    assert payload["symbol"] == "BTCUSDT"
    assert payload["requested_symbol"] == "BTCUSDT"
    assert payload["resolved_symbol"] == "BTCUSDT"
    assert payload["symbol_mode"] == "live"
    assert payload["supports_symbol_switching"] is True
    assert payload["price"] == 81234.56
    assert payload["signal"]["status"] == "LIVE_FEED"


def test_snapshot_accepts_symbol_override(monkeypatch):
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
            price=3521.25,
            change_24h_pct=1.2,
            high_24h=3600.0,
            low_24h=3400.0,
            pivot=3507.08,
            atr_14_pct=1.1,
            support=3480.0,
            resistance=3575.0,
            zone_context="SUPPORT",
            momentum_direction="BULLISH",
            momentum_strength="STRONG",
            momentum_change_pct=1.6,
            bias="BULLISH",
            score=78,
            signal=SignalState(
                direction="BUY",
                entry=3510.0,
                stop_loss=3475.0,
                take_profit=3570.0,
                risk_reward=1.71,
                status="LIVE_FEED",
            ),
            reasoning="ETH live snapshot ready.",
            updated_at=datetime(2026, 4, 17, 12, 0, tzinfo=timezone.utc),
        )

    monkeypatch.setattr(snapshot_router, "get_live_market_snapshot", fake_feed)

    response = client.get("/snapshot", params={"symbol": "ETHUSDT"})

    assert response.status_code == 200
    assert requested_symbols == ["ETHUSDT"]
    payload = response.json()
    assert payload["requested_symbol"] == "ETHUSDT"
    assert payload["resolved_symbol"] == "ETHUSDT"
    assert payload["symbol_mode"] == "live"



def test_snapshot_fallback_preserves_requested_symbol_metadata(monkeypatch):
    client = TestClient(app)

    def broken_feed(symbol: str):
        raise RuntimeError(f"feed down for {symbol}")

    monkeypatch.setattr(snapshot_router, "get_live_market_snapshot", broken_feed)

    response = client.get("/snapshot", params={"symbol": "ETHUSDT"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["requested_symbol"] == "ETHUSDT"
    assert payload["resolved_symbol"] == "ETHUSDT"
    assert payload["symbol_mode"] == "fallback"
    assert payload["supports_symbol_switching"] is True



def test_snapshot_falls_back_to_seeded_snapshot_when_live_feed_fails(monkeypatch):
    client = TestClient(app)

    def broken_feed(symbol: str):
        raise RuntimeError(f"feed down for {symbol}")

    monkeypatch.setattr(snapshot_router, "get_live_market_snapshot", broken_feed)

    response = client.get("/snapshot")

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "BTCUSDT"
    assert payload["requested_symbol"] == "BTCUSDT"
    assert payload["resolved_symbol"] == "BTCUSDT"
    assert payload["symbol_mode"] == "fallback"
    assert payload["supports_symbol_switching"] is True
    assert payload["signal"]["status"] == "WAIT_CONFIRMATION"
    assert payload["price"] == 74894.72
