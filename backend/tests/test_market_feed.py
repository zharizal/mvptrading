import pytest

from app.services.market_feed import (
    build_live_snapshot,
    fetch_binance_market_context,
    normalize_binance_candles,
    normalize_binance_ticker,
)


def test_normalize_binance_ticker_maps_fields_to_internal_market_state():
    raw_payload = {
        "symbol": "BTCUSDT",
        "lastPrice": "81234.56",
        "priceChangePercent": "2.50",
        "highPrice": "82000.00",
        "lowPrice": "79000.00",
    }

    result = normalize_binance_ticker(raw_payload)

    assert result["symbol"] == "BTCUSDT"
    assert result["price"] == 81234.56
    assert result["change_24h_pct"] == 2.5
    assert result["high_24h"] == 82000.0
    assert result["low_24h"] == 79000.0


def test_normalize_binance_ticker_raises_on_missing_required_field():
    with pytest.raises(KeyError):
        normalize_binance_ticker({"symbol": "BTCUSDT"})


def test_normalize_binance_candles_maps_ohlc_fields():
    raw_candles = [
        [1710000000000, "100.0", "110.0", "95.0", "108.0", "0", 0, "0", 0, "0", "0", "0"],
        [1710000060000, "108.0", "112.0", "104.0", "106.0", "0", 0, "0", 0, "0", "0", "0"],
    ]

    result = normalize_binance_candles(raw_candles)

    assert result == [
        {"open": 100.0, "high": 110.0, "low": 95.0, "close": 108.0, "volume": 0.0},
        {"open": 108.0, "high": 112.0, "low": 104.0, "close": 106.0, "volume": 0.0},
    ]


def test_build_live_snapshot_uses_structure_aware_targets_for_buy_setup():
    normalized = {
        "symbol": "BTCUSDT",
        "price": 100.25,
        "change_24h_pct": 2.5,
        "high_24h": 100.8,
        "low_24h": 98.0,
    }
    candles = [
        {"open": 98.7, "high": 100.8, "low": 100.0, "close": 100.5},
        {"open": 100.5, "high": 101.9, "low": 100.1, "close": 101.2},
        {"open": 101.2, "high": 101.6, "low": 100.0, "close": 100.25},
    ]

    snapshot = build_live_snapshot(normalized, candles=candles)

    assert snapshot.zone_context == "SUPPORT"
    assert snapshot.momentum_direction == "BULLISH"
    assert snapshot.momentum_strength == "STRONG"
    assert snapshot.momentum_change_pct == 1.57
    assert snapshot.signal.direction == "BUY"
    assert snapshot.signal.stop_loss < snapshot.support
    assert snapshot.signal.take_profit < snapshot.resistance
    assert snapshot.signal.risk_reward > 1.0



def test_build_live_snapshot_uses_candle_based_atr_when_candles_exist():
    normalized = {
        "symbol": "BTCUSDT",
        "price": 81234.56,
        "change_24h_pct": 2.5,
        "high_24h": 82000.0,
        "low_24h": 79000.0,
    }
    candles = [
        {"open": 100.0, "high": 100.0, "low": 95.0, "close": 98.0},
        {"open": 98.0, "high": 102.0, "low": 96.0, "close": 101.0},
        {"open": 101.0, "high": 103.0, "low": 99.0, "close": 100.0},
    ]

    snapshot = build_live_snapshot(normalized, candles=candles)

    assert snapshot.pivot == 80744.85
    assert snapshot.atr_14_pct == 0.01
    assert snapshot.bias == "BULLISH"
    assert snapshot.score == 75
    assert snapshot.support == 95.0
    assert snapshot.resistance == 103.0
    assert snapshot.zone_context == "BREAKOUT"
    assert snapshot.momentum_direction == "NEUTRAL"
    assert snapshot.momentum_strength == "WEAK"
    assert snapshot.momentum_change_pct == 0.0
    assert snapshot.signal.status == "WAIT_CONFIRMATION"
    assert snapshot.signal.direction == "WAIT"
    assert "BTCUSDT" in snapshot.reasoning
    assert "75/100" in snapshot.reasoning


def test_fetch_binance_market_context_returns_ticker_and_candles(monkeypatch):
    ticker_payload = {
        "symbol": "BTCUSDT",
        "lastPrice": "81234.56",
        "priceChangePercent": "2.50",
        "highPrice": "82000.00",
        "lowPrice": "79000.00",
    }
    candle_payload = [
        [1710000000000, "100.0", "110.0", "95.0", "108.0", "0", 0, "0", 0, "0", "0", "0"],
        [1710000060000, "108.0", "112.0", "104.0", "106.0", "0", 0, "0", 0, "0", "0", "0"],
    ]

    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    class FakeClient:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url, params=None):
            if "ticker/24hr" in url:
                return FakeResponse(ticker_payload)
            return FakeResponse(candle_payload)

    monkeypatch.setattr("app.services.market_feed.httpx.Client", lambda timeout=10.0: FakeClient())

    normalized, candles = fetch_binance_market_context("BTCUSDT")

    assert normalized["symbol"] == "BTCUSDT"
    assert len(candles) == 2
    assert candles[0]["high"] == 110.0
