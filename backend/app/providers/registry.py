"""Route a symbol to the correct provider.

Resolution order:
1. Canonical form `BASE/QUOTE` or URL form `BASE-QUOTE` → DB catalog lookup
2. Legacy no-separator form (e.g. `BTCUSDT`) → default to Binance provider

Callers get back `(provider, canonical_symbol)`. They can then call
`provider.fetch_market_context(canonical_symbol)`.
"""
from __future__ import annotations

from typing import Optional

from app.core.database import SessionLocal
from app.providers.base import MarketDataProvider
from app.providers.binance import BinanceProvider
from app.providers.twelvedata import TwelveDataProvider
from app.services.symbols import service as symbols_service

_PROVIDERS: dict[str, MarketDataProvider] = {
    "binance": BinanceProvider(),
    "twelvedata": TwelveDataProvider(),
}

# Exposed for callers that know the provider directly.
BINANCE: MarketDataProvider = _PROVIDERS["binance"]
TWELVEDATA: MarketDataProvider = _PROVIDERS["twelvedata"]


def get_provider(name: str) -> MarketDataProvider:
    try:
        return _PROVIDERS[name]
    except KeyError as exc:
        raise KeyError(f"Unknown provider: {name}") from exc


def _looks_like_canonical(symbol: str) -> bool:
    return "/" in symbol or "-" in symbol


def resolve(symbol: str) -> tuple[MarketDataProvider, str]:
    """Return (provider, canonical_symbol).

    `canonical_symbol` is the form the provider expects via
    `fetch_market_context`. For legacy Binance symbols (e.g. `BTCUSDT`) we
    synthesize a canonical `BTC/USDT` form by looking up the DB, else keep
    the legacy form and route to Binance.
    """
    upper = symbol.upper()
    if _looks_like_canonical(upper):
        canonical = upper.replace("-", "/")
        row = _lookup(canonical)
        if row is None:
            # Unknown canonical; best-effort: if it ends with a common quote, try Binance.
            if canonical.endswith(("/USDT", "/USDC", "/BTC")):
                return BINANCE, canonical
            raise KeyError(f"Symbol not in catalog: {canonical}")
        return get_provider(row.provider), canonical

    # Legacy no-separator: try reverse lookup against any catalog row where
    # binance's native form equals this input. Fast path: just try Binance.
    return BINANCE, upper


def _lookup(canonical: str) -> Optional[object]:
    with SessionLocal() as db:
        return symbols_service.get_by_canonical(db, canonical)
