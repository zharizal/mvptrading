"""Binance spot provider — public REST (no auth required).

Handles crypto pairs. Translates canonical `BTC/USDT` → native `BTCUSDT`.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.providers.base import NormalizedTicker
from app.services.analytics import Candle

TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr"
KLINES_URL = "https://api.binance.com/api/v3/klines"
KLINE_INTERVAL = "15m"
KLINE_LIMIT = 14
_TIMEOUT = 10.0


def _normalize_ticker(raw: dict[str, Any]) -> NormalizedTicker:
    return {
        "symbol": raw["symbol"],
        "price": float(raw["lastPrice"]),
        "change_24h_pct": float(raw["priceChangePercent"]),
        "high_24h": float(raw["highPrice"]),
        "low_24h": float(raw["lowPrice"]),
    }


def _normalize_candles(raw: list[list[Any]]) -> list[Candle]:
    return [
        {
            "open": float(c[1]),
            "high": float(c[2]),
            "low": float(c[3]),
            "close": float(c[4]),
            "volume": float(c[5]),
        }
        for c in raw
    ]


class BinanceProvider:
    name = "binance"

    def canonical_to_native(self, canonical: str) -> str:
        # BTC/USDT -> BTCUSDT. Already-native forms (no separator) pass through.
        return canonical.replace("/", "").replace("-", "").upper()

    def fetch_market_context(self, canonical: str) -> tuple[NormalizedTicker, list[Candle]]:
        native = self.canonical_to_native(canonical)
        with httpx.Client(timeout=_TIMEOUT) as client:
            ticker_resp = client.get(TICKER_URL, params={"symbol": native})
            ticker_resp.raise_for_status()
            klines_resp = client.get(
                KLINES_URL,
                params={"symbol": native, "interval": KLINE_INTERVAL, "limit": KLINE_LIMIT},
            )
            klines_resp.raise_for_status()
        return _normalize_ticker(ticker_resp.json()), _normalize_candles(klines_resp.json())
