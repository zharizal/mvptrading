from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field

Bias = Literal["BULLISH", "BEARISH", "NEUTRAL"]
Direction = Literal["BUY", "SELL", "WAIT"]
ZoneContext = Literal["SUPPORT", "RESISTANCE", "BREAKOUT", "BREAKDOWN", "MID_RANGE"]
MomentumDirection = Literal["BULLISH", "BEARISH", "NEUTRAL"]
MomentumStrength = Literal["STRONG", "WEAK"]
SymbolMode = Literal["live", "fallback", "preview"]


class SignalState(BaseModel):
    direction: Direction
    entry: float
    stop_loss: float
    take_profit: float
    risk_reward: float
    status: str


class SnapshotResponse(BaseModel):
    symbol: str
    requested_symbol: str
    resolved_symbol: str
    symbol_mode: SymbolMode
    supports_symbol_switching: bool
    price: float
    change_24h_pct: float
    high_24h: float
    low_24h: float
    pivot: float
    atr_14_pct: float
    support: float
    resistance: float
    zone_context: ZoneContext
    momentum_direction: MomentumDirection
    momentum_strength: MomentumStrength
    momentum_change_pct: float
    bias: Bias
    score: int = Field(ge=0, le=100)
    signal: SignalState
    reasoning: str
    updated_at: datetime
    candles: list[dict] = Field(default_factory=list)


# Symbol-aware base prices so the fallback snapshot doesn't echo BTC-$74k
# values for XAU/USD, EUR/USD, and other non-crypto symbols.
#
# These are plausible reference prices. When TwelveData is not configured,
# the fallback shows a neutral seed that at least matches the asset class
# — not a nonsensical BTC-shaped number.
_SEED_PRICES: dict[str, float] = {
    # Crypto (Binance canonical)
    "BTC/USDT": 74894.72,
    "ETH/USDT": 3500.0,
    "SOL/USDT": 180.0,
    "BNB/USDT": 600.0,
    "XRP/USDT": 0.62,
    "ADA/USDT": 0.50,
    "DOGE/USDT": 0.14,

    # Commodities (TwelveData)
    "XAU/USD": 2345.50,
    "XAG/USD": 28.40,

    # Forex (TwelveData)
    "EUR/USD": 1.0820,
    "GBP/USD": 1.2650,
    "USD/JPY": 150.25,
    "AUD/USD": 0.6580,
    "USD/IDR": 16250.0,
    "JPY/IDR": 108.20,
    "EUR/IDR": 17600.0,
}


def _canonical_lookup(raw_symbol: str) -> str:
    """Normalize BTCUSDT / BTC-USDT / BTC/USDT → 'BTC/USDT' for seed lookup."""
    upper = raw_symbol.upper()
    if "/" in upper:
        return upper
    if "-" in upper:
        return upper.replace("-", "/")
    # Legacy form — try to split on known quotes
    for q in ("USDT", "USDC", "BUSD", "USD", "IDR", "JPY", "EUR"):
        if upper.endswith(q) and upper != q:
            return f"{upper[:-len(q)]}/{q}"
    return upper


def _precision_for(symbol: str) -> int:
    """Pick sensible decimal precision per asset class."""
    s = symbol.upper()
    if s.endswith("/IDR") or s.endswith("IDR"):
        return 2
    if s.endswith("/JPY") or s.endswith("JPY"):
        return 3
    if "EUR/" in s or "GBP/" in s or "AUD/" in s or "USD/" in s:
        return 5
    if "XAU" in s or "XAG" in s:
        return 2
    # Crypto
    if s.endswith("USDT") or s.endswith("USD"):
        return 2
    return 5


def seeded_snapshot(symbol: str) -> SnapshotResponse:
    """Produce a neutral fallback snapshot using symbol-appropriate price scale.

    Used when live feed (Binance / TwelveData) cannot be reached. Values are
    generated proportionally around a plausible base price so numbers still
    look correct (Pivot near Price, Support below, Resistance above, etc.)
    rather than echoing BTC-shaped data for a forex pair.
    """
    canonical = _canonical_lookup(symbol)
    base = _SEED_PRICES.get(canonical, 1.0)
    precision = _precision_for(symbol)

    # Everything scales as small % offsets around the base price.
    def r(val: float) -> float:
        return round(val, precision)

    high = r(base * 1.008)
    low = r(base * 0.992)
    pivot = r(base * 0.998)
    support = r(base * 0.9945)
    resistance = r(base * 1.0045)
    entry = r(base * 0.999)
    stop_loss = r(base * 0.9935)
    take_profit = r(base * 1.010)
    risk = abs(entry - stop_loss) or 1.0
    reward = abs(take_profit - entry)
    rr = round(reward / risk, 2)

    return SnapshotResponse(
        symbol=symbol,
        requested_symbol=symbol,
        resolved_symbol=symbol,
        symbol_mode="fallback",
        supports_symbol_switching=True,
        price=r(base),
        change_24h_pct=-0.4,
        high_24h=high,
        low_24h=low,
        pivot=pivot,
        atr_14_pct=0.38,
        support=support,
        resistance=resistance,
        zone_context="MID_RANGE",
        momentum_direction="BULLISH",
        momentum_strength="WEAK",
        momentum_change_pct=0.42,
        bias="BULLISH",
        score=77,
        signal=SignalState(
            direction="BUY",
            entry=entry,
            stop_loss=stop_loss,
            take_profit=take_profit,
            risk_reward=rr,
            status="WAIT_CONFIRMATION",
        ),
        reasoning=(
            "Fallback seed — live feed unavailable for this symbol. "
            "Values are proportional to the asset's typical range; connect "
            "the provider to see real-time structure."
        ),
        updated_at=datetime.now(timezone.utc),
    )
