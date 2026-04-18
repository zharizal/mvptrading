"""Tests for provider adapters and the routing registry."""
from __future__ import annotations

import pytest

from app.config import get_settings
from app.providers import registry
from app.providers.binance import BinanceProvider
from app.providers.twelvedata import TwelveDataError, TwelveDataProvider, _normalize_candles, _normalize_quote


# ------------------- Binance ------------------- #

def test_binance_canonical_to_native_strips_separators():
    p = BinanceProvider()
    assert p.canonical_to_native("BTC/USDT") == "BTCUSDT"
    assert p.canonical_to_native("BTC-USDT") == "BTCUSDT"
    assert p.canonical_to_native("BTCUSDT") == "BTCUSDT"


# ------------------- TwelveData ------------------- #

def test_twelvedata_canonical_to_native_preserves_slash():
    p = TwelveDataProvider()
    assert p.canonical_to_native("XAU/USD") == "XAU/USD"
    assert p.canonical_to_native("XAU-USD") == "XAU/USD"
    assert p.canonical_to_native("jpy/idr") == "JPY/IDR"


def test_twelvedata_normalize_quote_maps_fields():
    raw = {
        "symbol": "XAU/USD",
        "close": "2345.67",
        "high": "2360.12",
        "low": "2320.50",
        "percent_change": "0.75",
    }
    out = _normalize_quote(raw)
    assert out["symbol"] == "XAU/USD"
    assert out["price"] == 2345.67
    assert out["high_24h"] == 2360.12
    assert out["low_24h"] == 2320.50
    assert out["change_24h_pct"] == 0.75


def test_twelvedata_normalize_quote_raises_on_malformed():
    with pytest.raises(TwelveDataError):
        _normalize_quote({"symbol": "XAU/USD"})  # missing close/high/low


def test_twelvedata_normalize_candles_reverses_to_oldest_first():
    raw = {
        "values": [
            # TwelveData returns latest-first
            {"open": "3", "high": "3.5", "low": "2.5", "close": "3.2"},
            {"open": "2", "high": "2.5", "low": "1.8", "close": "2.3"},
            {"open": "1", "high": "1.5", "low": "0.8", "close": "1.2"},
        ]
    }
    candles = _normalize_candles(raw)
    assert [c["close"] for c in candles] == [1.2, 2.3, 3.2]  # oldest-first


def test_twelvedata_fetch_raises_without_api_key(monkeypatch):
    monkeypatch.setenv("TWELVEDATA_API_KEY", "")
    get_settings.cache_clear()
    p = TwelveDataProvider()
    with pytest.raises(TwelveDataError):
        p.fetch_market_context("XAU/USD")
    get_settings.cache_clear()


# ------------------- Registry ------------------- #

def test_registry_resolves_canonical_slash_to_provider_from_catalog():
    # Catalog seeded by conftest in test_snapshot/test_ws or we can ensure it here.
    # These tests use a shared sqlite DB — symbol catalog seeded by lifespan.
    # For pure unit validity we just assert routing logic: /-form goes to DB lookup.
    from app.core.database import SessionLocal, init_db
    from app.services.symbols.catalog import seed_symbols

    init_db()
    with SessionLocal() as db:
        seed_symbols(db)

    provider, canonical = registry.resolve("BTC/USDT")
    assert provider.name == "binance"
    assert canonical == "BTC/USDT"

    provider, canonical = registry.resolve("XAU-USD")
    assert provider.name == "twelvedata"
    assert canonical == "XAU/USD"


def test_registry_falls_back_to_binance_for_legacy_no_separator():
    provider, canonical = registry.resolve("BTCUSDT")
    assert provider.name == "binance"
    assert canonical == "BTCUSDT"


def test_registry_raises_for_unknown_canonical():
    with pytest.raises(KeyError):
        registry.resolve("FOO/BAR")
