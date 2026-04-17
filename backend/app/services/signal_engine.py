from typing import Literal

from app.schemas import Bias, SignalState, ZoneContext


MomentumDirection = Literal["BULLISH", "BEARISH", "NEUTRAL"]
MomentumStrength = Literal["STRONG", "WEAK"]


def build_signal(
    price: float,
    bias: Bias,
    atr_14_pct: float,
    score: int,
    change_24h_pct: float,
    distance_to_pivot_pct: float,
    momentum_direction: MomentumDirection,
    momentum_strength: MomentumStrength,
    zone_context: ZoneContext,
    support: float,
    resistance: float,
) -> SignalState:
    atr_move = max(price * (atr_14_pct / 100) * 0.6, price * 0.004)
    structure_buffer = price * 0.0015

    bullish_zone_confirmed = zone_context in {"SUPPORT", "BREAKOUT"}
    bearish_zone_confirmed = zone_context in {"RESISTANCE", "BREAKDOWN"}

    strong_bullish = (
        bias == "BULLISH"
        and score >= 72
        and change_24h_pct >= 1.0
        and atr_14_pct >= 1.2
        and momentum_direction == "BULLISH"
        and momentum_strength == "STRONG"
        and bullish_zone_confirmed
    )
    strong_bearish = (
        bias == "BEARISH"
        and score <= 35
        and change_24h_pct <= -1.0
        and atr_14_pct >= 1.2
        and momentum_direction == "BEARISH"
        and momentum_strength == "STRONG"
        and bearish_zone_confirmed
    )
    too_close_to_pivot = distance_to_pivot_pct <= 0.15

    if strong_bullish and not too_close_to_pivot:
        entry = round(price * 0.998, 2)
        atr_stop = entry - atr_move
        atr_take_profit = entry + (atr_move * 1.8)
        if zone_context == "SUPPORT":
            stop_loss = round(max(atr_stop, support - structure_buffer), 2)
            take_profit = round(min(atr_take_profit, resistance - structure_buffer), 2)
        else:
            stop_loss = round(max(atr_stop, resistance - structure_buffer), 2)
            take_profit = round(atr_take_profit, 2)
        status = "LIVE_FEED"
        direction = "BUY"
    elif strong_bearish and not too_close_to_pivot:
        entry = round(price * 1.002, 2)
        atr_stop = entry + atr_move
        atr_take_profit = entry - (atr_move * 1.8)
        if zone_context == "RESISTANCE":
            stop_loss = round(min(atr_stop, resistance + structure_buffer), 2)
            take_profit = round(max(atr_take_profit, support + structure_buffer), 2)
        else:
            stop_loss = round(min(atr_stop, support + structure_buffer), 2)
            take_profit = round(atr_take_profit, 2)
        status = "LIVE_FEED"
        direction = "SELL"
    else:
        entry = round(price, 2)
        stop_loss = round(price - atr_move, 2)
        take_profit = round(price + atr_move, 2)
        status = "WAIT_CONFIRMATION"
        direction = "WAIT"

    risk = abs(entry - stop_loss) or 1.0
    reward = abs(take_profit - entry)
    risk_reward = round(reward / risk, 2)

    return SignalState(
        direction=direction,
        entry=entry,
        stop_loss=stop_loss,
        take_profit=take_profit,
        risk_reward=risk_reward,
        status=status,
    )
