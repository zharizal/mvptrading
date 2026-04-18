"""Provider interface.

All providers normalize their vendor-specific response into the same tuple
shape so the downstream pipeline (analytics, signal engine, reasoning) stays
provider-agnostic.

NormalizedTicker keys:
    symbol:          provider-native or canonical string (display only)
    price:           float, last trade / mid
    change_24h_pct:  float, percentage change over 24h
    high_24h:        float
    low_24h:         float

Candle shape (already defined in `services.analytics`):
    {open, high, low, close}
"""
from __future__ import annotations

from typing import Protocol

from app.services.analytics import Candle

NormalizedTicker = dict


class MarketDataProvider(Protocol):
    name: str

    def canonical_to_native(self, canonical: str) -> str:
        """Translate canonical symbol (BASE/QUOTE) to this provider's native form."""
        ...

    def fetch_market_context(self, canonical: str) -> tuple[NormalizedTicker, list[Candle]]:
        """Fetch ticker + 15m candles. Caller passes canonical form; provider
        handles its own translation internally."""
        ...
