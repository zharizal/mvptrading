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


def seeded_snapshot(symbol: str) -> SnapshotResponse:
    return SnapshotResponse(
        symbol=symbol,
        requested_symbol=symbol,
        resolved_symbol=symbol,
        symbol_mode="fallback",
        supports_symbol_switching=True,
        price=74894.72,
        change_24h_pct=-0.4,
        high_24h=75514.52,
        low_24h=73545.0,
        pivot=74708.86,
        atr_14_pct=0.38,
        support=74480.0,
        resistance=75210.0,
        zone_context="MID_RANGE",
        momentum_direction="BULLISH",
        momentum_strength="WEAK",
        momentum_change_pct=0.42,
        bias="BULLISH",
        score=77,
        signal=SignalState(
            direction="BUY",
            entry=74796.86,
            stop_loss=74355.97,
            take_profit=75608.32,
            risk_reward=1.84,
            status="WAIT_CONFIRMATION",
        ),
        reasoning="Trend is constructive, but momentum is soft. Wait for confirmation near pivot before entry.",
        updated_at=datetime.now(timezone.utc),
    )
