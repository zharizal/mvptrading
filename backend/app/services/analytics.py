from typing import Literal, TypedDict

from app.schemas import Bias, ZoneContext


class Candle(TypedDict):
    open: float
    high: float
    low: float
    close: float


class CandleMomentum(TypedDict):
    direction: Literal["BULLISH", "BEARISH", "NEUTRAL"]
    strength: Literal["STRONG", "WEAK"]
    change_pct: float


class SupportResistance(TypedDict):
    support: float
    resistance: float


def compute_pivot(high_24h: float, low_24h: float, close: float) -> float:
    return round((high_24h + low_24h + close) / 3, 2)


def compute_atr_pct_from_range(high_24h: float, low_24h: float, close: float) -> float:
    return round(abs(high_24h - low_24h) / close * 100, 2)


def compute_atr_from_candles(candles: list[Candle]) -> float:
    if not candles:
        raise ValueError("candles are required to compute ATR")

    true_ranges: list[float] = []
    previous_close: float | None = None

    for candle in candles:
        high = candle["high"]
        low = candle["low"]
        if previous_close is None:
            true_range = high - low
        else:
            true_range = max(high - low, abs(high - previous_close), abs(low - previous_close))
        true_ranges.append(true_range)
        previous_close = candle["close"]

    return round(sum(true_ranges) / len(true_ranges), 2)


def compute_atr_pct_from_candles(candles: list[Candle], close: float) -> float:
    atr = compute_atr_from_candles(candles)
    return round(atr / close * 100, 2)


def compute_candle_momentum(candles: list[Candle]) -> CandleMomentum:
    if len(candles) < 2:
        return {"direction": "NEUTRAL", "strength": "WEAK", "change_pct": 0.0}

    first_open = candles[0]["open"]
    last_close = candles[-1]["close"]
    change_pct = round(((last_close - first_open) / first_open) * 100, 2)

    bullish_closes = sum(1 for candle in candles if candle["close"] > candle["open"])
    bearish_closes = sum(1 for candle in candles if candle["close"] < candle["open"])

    if change_pct >= 0.5 and bullish_closes >= max(2, len(candles) - 1):
        return {"direction": "BULLISH", "strength": "STRONG", "change_pct": change_pct}
    if change_pct <= -0.5 and bearish_closes >= max(2, len(candles) - 1):
        return {"direction": "BEARISH", "strength": "STRONG", "change_pct": change_pct}
    if change_pct > 0:
        return {"direction": "BULLISH", "strength": "WEAK", "change_pct": change_pct}
    if change_pct < 0:
        return {"direction": "BEARISH", "strength": "WEAK", "change_pct": change_pct}
    return {"direction": "NEUTRAL", "strength": "WEAK", "change_pct": change_pct}


def compute_support_resistance(candles: list[Candle]) -> SupportResistance:
    if not candles:
        raise ValueError("candles are required to compute support and resistance")

    return {
        "support": round(min(candle["low"] for candle in candles), 2),
        "resistance": round(max(candle["high"] for candle in candles), 2),
    }


def compute_zone_context(price: float, support: float, resistance: float) -> ZoneContext:
    if price <= support * 0.998:
        return "BREAKDOWN"
    if price >= resistance * 1.002:
        return "BREAKOUT"

    support_distance_pct = abs(price - support) / price * 100
    resistance_distance_pct = abs(resistance - price) / price * 100

    if support_distance_pct <= 0.35:
        return "SUPPORT"
    if resistance_distance_pct <= 0.35:
        return "RESISTANCE"
    return "MID_RANGE"


def classify_bias(close: float, pivot: float, change_24h_pct: float) -> Bias:
    if close >= pivot and change_24h_pct >= 0:
        return "BULLISH"
    if close < pivot and change_24h_pct < 0:
        return "BEARISH"
    return "NEUTRAL"


def compute_score(bias: Bias, change_24h_pct: float, atr_14_pct: float, close: float, pivot: float) -> int:
    score = 50

    if bias == "BULLISH":
        score += 12
    elif bias == "BEARISH":
        score -= 12

    if change_24h_pct > 0:
        score += min(int(change_24h_pct * 4), 10)
    elif change_24h_pct < 0:
        score -= min(int(abs(change_24h_pct) * 4), 12)

    distance_pct = abs(close - pivot) / close * 100
    score += min(int(distance_pct * 10), 6)

    if bias == "BEARISH" and close < pivot:
        score -= 5

    if atr_14_pct >= 2:
        score += 0
    else:
        score -= 3

    return max(0, min(score, 100))
