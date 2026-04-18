"""TwelveData provider — forex, commodities, indices.

Requires `TWELVEDATA_API_KEY`. Rate limits on free tier:
    8 req/min, 800 req/day

Endpoints used:
    GET /quote         — latest quote with 24h stats
    GET /time_series   — OHLC candles (15min interval, 14 outputs)

Canonical symbol passes through unchanged (TwelveData already uses BASE/QUOTE).
"""
from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.providers.base import NormalizedTicker
from app.services.analytics import Candle

_KLINE_INTERVAL = "15min"
_KLINE_LIMIT = 14
_TIMEOUT = 10.0


class TwelveDataError(RuntimeError):
    pass


def _normalize_quote(raw: dict[str, Any]) -> NormalizedTicker:
    # TwelveData quote payload has nested fields; pick the ones we need.
    # Some IDR forex pairs return string numbers — coerce carefully.
    try:
        close = float(raw["close"])
        high = float(raw["high"])
        low = float(raw["low"])
        percent_change = float(raw.get("percent_change", 0.0))
    except (KeyError, TypeError, ValueError) as exc:
        raise TwelveDataError(f"Malformed quote payload: {raw}") from exc
    return {
        "symbol": str(raw.get("symbol", "")),
        "price": close,
        "change_24h_pct": percent_change,
        "high_24h": high,
        "low_24h": low,
    }


def _normalize_candles(raw: dict[str, Any]) -> list[Candle]:
    """TwelveData returns latest-first; reverse to oldest-first to match Binance."""
    values = raw.get("values") or []
    candles: list[Candle] = []
    for row in reversed(values):
        try:
            candles.append({
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row.get("volume", 0)),
            })
        except (KeyError, TypeError, ValueError):
            continue
    return candles


def _assert_ok(payload: dict[str, Any], endpoint: str) -> None:
    # TwelveData signals errors with `{"status": "error", "message": "..."}`
    if isinstance(payload, dict) and payload.get("status") == "error":
        raise TwelveDataError(f"{endpoint}: {payload.get('message', 'unknown')}")


class TwelveDataProvider:
    name = "twelvedata"

    def canonical_to_native(self, canonical: str) -> str:
        # Already native form (BASE/QUOTE with slash).
        return canonical.replace("-", "/").upper()

    def _call(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        api_key = settings.twelvedata_api_key
        if not api_key:
            raise TwelveDataError("TWELVEDATA_API_KEY not configured")
        merged = {**params, "apikey": api_key}
        url = settings.twelvedata_base_url.rstrip("/") + path
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.get(url, params=merged)
            resp.raise_for_status()
            data = resp.json()
        _assert_ok(data, path)
        return data

    def fetch_market_context(self, canonical: str) -> tuple[NormalizedTicker, list[Candle]]:
        native = self.canonical_to_native(canonical)
        quote = self._call("/quote", {"symbol": native})
        series = self._call(
            "/time_series",
            {"symbol": native, "interval": _KLINE_INTERVAL, "outputsize": _KLINE_LIMIT},
        )
        return _normalize_quote(quote), _normalize_candles(series)
