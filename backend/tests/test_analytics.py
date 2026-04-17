from app.services.analytics import (
    classify_bias,
    compute_atr_from_candles,
    compute_atr_pct_from_candles,
    compute_atr_pct_from_range,
    compute_candle_momentum,
    compute_pivot,
    compute_score,
    compute_support_resistance,
    compute_zone_context,
)


def test_compute_pivot_uses_high_low_close_average():
    result = compute_pivot(high_24h=82000.0, low_24h=79000.0, close=81234.56)

    assert result == 80744.85


def test_compute_atr_pct_from_range_uses_range_over_price():
    result = compute_atr_pct_from_range(high_24h=82000.0, low_24h=79000.0, close=81234.56)

    assert result == 3.69


def test_compute_atr_from_candles_uses_true_range_average():
    candles = [
        {"high": 100.0, "low": 95.0, "close": 98.0},
        {"high": 102.0, "low": 96.0, "close": 101.0},
        {"high": 103.0, "low": 99.0, "close": 100.0},
    ]

    result = compute_atr_from_candles(candles)

    assert result == 5.0


def test_compute_atr_pct_from_candles_uses_atr_over_close():
    candles = [
        {"high": 100.0, "low": 95.0, "close": 98.0},
        {"high": 102.0, "low": 96.0, "close": 101.0},
        {"high": 103.0, "low": 99.0, "close": 100.0},
    ]

    result = compute_atr_pct_from_candles(candles, close=100.0)

    assert result == 5.0


def test_compute_candle_momentum_detects_bullish_recent_sequence():
    candles = [
        {"open": 100.0, "high": 101.0, "low": 99.0, "close": 100.5},
        {"open": 100.5, "high": 102.0, "low": 100.0, "close": 101.6},
        {"open": 101.6, "high": 103.0, "low": 101.2, "close": 102.8},
    ]

    result = compute_candle_momentum(candles)

    assert result["direction"] == "BULLISH"
    assert result["strength"] == "STRONG"
    assert result["change_pct"] == 2.8


def test_compute_candle_momentum_detects_bearish_recent_sequence():
    candles = [
        {"open": 103.0, "high": 104.0, "low": 102.5, "close": 103.1},
        {"open": 103.1, "high": 103.2, "low": 101.5, "close": 101.8},
        {"open": 101.8, "high": 102.0, "low": 99.8, "close": 100.2},
    ]

    result = compute_candle_momentum(candles)

    assert result["direction"] == "BEARISH"
    assert result["strength"] == "STRONG"
    assert result["change_pct"] == -2.72


def test_compute_support_resistance_uses_recent_swing_extremes():
    candles = [
        {"open": 100.0, "high": 102.0, "low": 99.0, "close": 101.2},
        {"open": 101.2, "high": 103.5, "low": 100.8, "close": 103.0},
        {"open": 103.0, "high": 104.1, "low": 101.4, "close": 101.8},
        {"open": 101.8, "high": 102.6, "low": 98.7, "close": 99.4},
    ]

    result = compute_support_resistance(candles)

    assert result["support"] == 98.7
    assert result["resistance"] == 104.1


def test_compute_zone_context_detects_breakout_confirmation():
    result = compute_zone_context(price=105.0, support=98.7, resistance=104.1)

    assert result == "BREAKOUT"


def test_compute_zone_context_detects_support_retest():
    result = compute_zone_context(price=99.0, support=98.7, resistance=104.1)

    assert result == "SUPPORT"


def test_classify_bias_returns_bullish_when_close_above_pivot():
    result = classify_bias(close=81234.56, pivot=80744.85, change_24h_pct=2.5)

    assert result == "BULLISH"


def test_classify_bias_returns_bearish_when_close_below_pivot_and_negative_change():
    result = classify_bias(close=79900.0, pivot=80744.85, change_24h_pct=-1.2)

    assert result == "BEARISH"


def test_classify_bias_returns_neutral_when_signals_conflict():
    result = classify_bias(close=79900.0, pivot=80744.85, change_24h_pct=1.2)

    assert result == "NEUTRAL"


def test_compute_score_returns_higher_value_for_bullish_positive_market():
    result = compute_score(
        bias="BULLISH",
        change_24h_pct=2.5,
        atr_14_pct=3.69,
        close=81234.56,
        pivot=80744.85,
    )

    assert result == 78


def test_compute_score_returns_lower_value_for_bearish_market():
    result = compute_score(
        bias="BEARISH",
        change_24h_pct=-2.0,
        atr_14_pct=3.69,
        close=79900.0,
        pivot=80744.85,
    )

    assert result == 31
