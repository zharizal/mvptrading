"""Market data pipeline — facade over the provider layer.

Kept as a single module for backward compatibility with existing tests.
All provider-specific logic now lives under `app.providers.*`; this module
only composes analytics + signal + reasoning on top of normalized data.
"""
from datetime import datetime, timezone
from typing import Any

# `httpx` is re-exported at module level so existing tests that monkeypatch
# `app.services.market_feed.httpx.Client` continue to work. Binance calls
# below go through the provider layer, which has its own httpx usage.
import httpx  # noqa: F401 — kept for test monkeypatching compatibility

from app.providers import registry as provider_registry
from app.providers.binance import (
    KLINE_INTERVAL as _KLINE_INTERVAL,
    KLINE_LIMIT as _KLINE_LIMIT,
    KLINES_URL as BINANCE_KLINES_URL,
    TICKER_URL as BINANCE_TICKER_URL,
    _normalize_candles as normalize_binance_candles,
    _normalize_ticker as normalize_binance_ticker,
)
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

KLINE_INTERVAL = _KLINE_INTERVAL
KLINE_LIMIT = _KLINE_LIMIT


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
        candles=candles or [],
    )


def fetch_binance_market_context(symbol: str) -> tuple[dict[str, float | str], list[Candle]]:
    """Legacy helper — fetch via Binance directly. Kept for tests.

    Uses the module-level `httpx` symbol (which tests may monkeypatch) to
    preserve behavior. New code should go through `provider_registry.resolve`.
    """
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

    return normalize_binance_ticker(raw_ticker), normalize_binance_candles(raw_klines)


def get_live_market_snapshot(symbol: str) -> SnapshotResponse:
    """Fetch live snapshot for any canonical / legacy symbol.

    Routing:
      - `BTC/USDT` or `BTC-USDT` → DB lookup → provider from catalog
      - `BTCUSDT` (legacy, no separator) → Binance fast path
    """
    upper = symbol.upper()
    if "/" in upper or "-" in upper:
        provider, canonical = provider_registry.resolve(upper)
        normalized, candles = provider.fetch_market_context(canonical)
        # Echo back the user-provided form (with slash normalized) so clients
        # see a consistent `resolved_symbol`.
        display_symbol = upper.replace("-", "/")
        normalized = {**normalized, "symbol": display_symbol}
        return build_live_snapshot(normalized, candles=candles, requested_symbol=symbol)

    # Legacy path — behavior unchanged for existing BTCUSDT callers.
    normalized, candles = fetch_binance_market_context(upper)
    return build_live_snapshot(normalized, candles=candles, requested_symbol=symbol)
