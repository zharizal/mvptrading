"""Master symbol catalog — seeded into the `symbols` table on startup.

Canonical format: BASE/QUOTE (e.g. 'BTC/USDT', 'XAU/USD', 'JPY/IDR').

Adding a symbol:
1. Append to CATALOG below with full metadata
2. Ensure the provider's adapter can handle it (symbol translation in provider)
3. Restart backend — `seed_symbols()` upserts new rows
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from sqlalchemy.orm import Session

from app.db.models import Symbol


@dataclass(frozen=True)
class SymbolSeed:
    canonical_symbol: str
    display_name: str
    asset_class: str            # 'crypto' | 'forex' | 'commodity'
    provider: str               # 'binance' | 'twelvedata'
    base_ccy: str
    quote_ccy: str
    pip_size: float | None
    tradingview_symbol: str
    sort_order: int


CATALOG: tuple[SymbolSeed, ...] = (
    # Crypto via Binance
    SymbolSeed("BTC/USDT", "Bitcoin / Tether",   "crypto", "binance", "BTC",  "USDT", None, "BINANCE:BTCUSDT", 10),
    SymbolSeed("ETH/USDT", "Ethereum / Tether",  "crypto", "binance", "ETH",  "USDT", None, "BINANCE:ETHUSDT", 20),
    SymbolSeed("SOL/USDT", "Solana / Tether",    "crypto", "binance", "SOL",  "USDT", None, "BINANCE:SOLUSDT", 30),
    SymbolSeed("BNB/USDT", "BNB / Tether",       "crypto", "binance", "BNB",  "USDT", None, "BINANCE:BNBUSDT", 40),
    SymbolSeed("XRP/USDT", "XRP / Tether",       "crypto", "binance", "XRP",  "USDT", None, "BINANCE:XRPUSDT", 50),
    SymbolSeed("ADA/USDT", "Cardano / Tether",   "crypto", "binance", "ADA",  "USDT", None, "BINANCE:ADAUSDT", 60),
    SymbolSeed("DOGE/USDT","Dogecoin / Tether",  "crypto", "binance", "DOGE", "USDT", None, "BINANCE:DOGEUSDT", 70),

    # Commodities via TwelveData
    SymbolSeed("XAU/USD", "Gold / US Dollar",    "commodity", "twelvedata", "XAU", "USD", 0.01, "OANDA:XAUUSD", 110),
    SymbolSeed("XAG/USD", "Silver / US Dollar",  "commodity", "twelvedata", "XAG", "USD", 0.001, "OANDA:XAGUSD", 120),

    # Forex via TwelveData
    SymbolSeed("EUR/USD", "Euro / US Dollar",    "forex", "twelvedata", "EUR", "USD", 0.0001, "OANDA:EURUSD", 210),
    SymbolSeed("GBP/USD", "British Pound / USD", "forex", "twelvedata", "GBP", "USD", 0.0001, "OANDA:GBPUSD", 220),
    SymbolSeed("USD/JPY", "US Dollar / Yen",     "forex", "twelvedata", "USD", "JPY", 0.01,   "OANDA:USDJPY", 230),
    SymbolSeed("AUD/USD", "Aussie / US Dollar",  "forex", "twelvedata", "AUD", "USD", 0.0001, "OANDA:AUDUSD", 240),
    SymbolSeed("USD/IDR", "US Dollar / Rupiah",  "forex", "twelvedata", "USD", "IDR", 1.0,    "FX_IDC:USDIDR", 310),
    SymbolSeed("JPY/IDR", "Yen / Rupiah",        "forex", "twelvedata", "JPY", "IDR", 0.01,   "FX_IDC:JPYIDR", 320),
    SymbolSeed("EUR/IDR", "Euro / Rupiah",       "forex", "twelvedata", "EUR", "IDR", 1.0,    "FX_IDC:EURIDR", 330),
)


def seed_symbols(db: Session, *, catalog: Iterable[SymbolSeed] = CATALOG) -> int:
    """Upsert catalog rows. Returns count of rows added/updated.

    - New canonical_symbols: inserted enabled=1
    - Existing: metadata refreshed (display_name, provider, tradingview_symbol, sort_order)
      — `enabled` is left untouched so user admin toggles persist
    """
    count = 0
    for seed in catalog:
        row = db.get(Symbol, seed.canonical_symbol)
        if row is None:
            db.add(Symbol(
                canonical_symbol=seed.canonical_symbol,
                display_name=seed.display_name,
                asset_class=seed.asset_class,
                provider=seed.provider,
                base_ccy=seed.base_ccy,
                quote_ccy=seed.quote_ccy,
                pip_size=seed.pip_size,
                tradingview_symbol=seed.tradingview_symbol,
                enabled=1,
                sort_order=seed.sort_order,
            ))
            count += 1
        else:
            row.display_name = seed.display_name
            row.asset_class = seed.asset_class
            row.provider = seed.provider
            row.base_ccy = seed.base_ccy
            row.quote_ccy = seed.quote_ccy
            row.pip_size = seed.pip_size
            row.tradingview_symbol = seed.tradingview_symbol
            row.sort_order = seed.sort_order
            count += 1
    db.commit()
    return count
