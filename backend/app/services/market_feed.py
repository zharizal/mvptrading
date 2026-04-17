from datetime import datetime, timezone
from typing import Any

import httpx

from app.schemas import SnapshotResponse
from app.services.analytics import (
    Candle,
    classify_bias,
    compute_atr_pct_from_candles,
    compute_atr_pct_from_range,
    compute_candle_momentum,
    compute_pivot,
    compute_score,
    compute_support_resistance,
    compute_zone_context,
)
from app.services.reasoning import build_reasoning
from app.services.signal_engine import build_signal

BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr"
BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
KLINE_INTERVAL = "15m"
KLINE_LIMIT = 14


def normalize_binance_ticker(raw_payload: dict[str, Any]) -> dict[str, float | str]:
    return {
        "symbol": raw_payload["symbol"],
        "price": float(raw_payload["lastPrice"]),
        "change_24h_pct": float(raw_payload["priceChangePercent"]),
        "high_24h": float(raw_payload["highPrice"]),
        "low_24h": float(raw_payload["lowPrice"]),
    }


def normalize_binance_candles(raw_candles: list[list[Any]]) -> list[Candle]:
    return [
        {
            "open": float(candle[1]),
            "high": float(candle[2]),
            "low": float(candle[3]),
            "close": float(candle[4]),
        }
        for candle in raw_candles
    ]


def build_live_snapshot(
    normalized: dict[str, float | str],
    candles: list[Candle] | None = None,
    requested_symbol: str | None = None,
) -> SnapshotResponse:
    price = float(normalized["price"])
    resolved_symbol = str(normalized["symbol"])
    effective_requested_symbol = requested_symbol or resolved_symbol
    high_24h = float(normalized["high_24h"])
    low_24h = float(normalized["low_24h"])
    change_24h_pct = float(normalized["change_24h_pct"])

    pivot = compute_pivot(high_24h=high_24h, low_24h=low_24h, close=price)
    atr_14_pct = (
        compute_atr_pct_from_candles(candles, close=price)
        if candles
        else compute_atr_pct_from_range(high_24h=high_24h, low_24h=low_24h, close=price)
    )
    bias = classify_bias(close=price, pivot=pivot, change_24h_pct=change_24h_pct)
    score = compute_score(
        bias=bias,
        change_24h_pct=change_24h_pct,
        atr_14_pct=atr_14_pct,
        close=price,
        pivot=pivot,
    )
    distance_to_pivot_pct = abs(price - pivot) / price * 100
    momentum = compute_candle_momentum(candles) if candles else {"direction": "NEUTRAL", "strength": "WEAK", "change_pct": 0.0}
    support_resistance = (
        compute_support_resistance(candles)
        if candles
        else {"support": round(low_24h, 2), "resistance": round(high_24h, 2)}
    )
    zone_context = compute_zone_context(
        price=price,
        support=support_resistance["support"],
        resistance=support_resistance["resistance"],
    )
    signal = build_signal(
        price=price,
        bias=bias,
        atr_14_pct=atr_14_pct,
        score=score,
        change_24h_pct=change_24h_pct,
        distance_to_pivot_pct=distance_to_pivot_pct,
        momentum_direction=momentum["direction"],
        momentum_strength=momentum["strength"],
        zone_context=zone_context,
        support=support_resistance["support"],
        resistance=support_resistance["resistance"],
    )
    reasoning = build_reasoning(
        symbol=str(normalized["symbol"]),
        bias=bias,
        score=score,
        change_24h_pct=change_24h_pct,
        atr_14_pct=atr_14_pct,
        pivot=pivot,
        price=price,
        support=support_resistance["support"],
        resistance=support_resistance["resistance"],
        zone_context=zone_context,
        signal_direction=signal.direction,
    )

    return SnapshotResponse(
        symbol=resolved_symbol,
        requested_symbol=effective_requested_symbol,
        resolved_symbol=resolved_symbol,
        symbol_mode="live",
        supports_symbol_switching=True,
        price=price,
        change_24h_pct=change_24h_pct,
        high_24h=high_24h,
        low_24h=low_24h,
        pivot=pivot,
        atr_14_pct=atr_14_pct,
        support=support_resistance["support"],
        resistance=support_resistance["resistance"],
        zone_context=zone_context,
        momentum_direction=momentum["direction"],
        momentum_strength=momentum["strength"],
        momentum_change_pct=momentum["change_pct"],
        bias=bias,
        score=score,
        signal=signal,
        reasoning=reasoning,
        updated_at=datetime.now(timezone.utc),
    )


def fetch_binance_market_context(symbol: str) -> tuple[dict[str, float | str], list[Candle]]:
    with httpx.Client(timeout=10.0) as client:
        ticker_response = client.get(BINANCE_TICKER_URL, params={"symbol": symbol})
        ticker_response.raise_for_status()
        raw_ticker = ticker_response.json()

        klines_response = client.get(
            BINANCE_KLINES_URL,
            params={"symbol": symbol, "interval": KLINE_INTERVAL, "limit": KLINE_LIMIT},
        )
        klines_response.raise_for_status()
        raw_klines = klines_response.json()

    normalized_ticker = normalize_binance_ticker(raw_ticker)
    normalized_candles = normalize_binance_candles(raw_klines)
    return normalized_ticker, normalized_candles


def get_live_market_snapshot(symbol: str) -> SnapshotResponse:
    normalized, candles = fetch_binance_market_context(symbol)
    return build_live_snapshot(normalized, candles=candles, requested_symbol=symbol)
