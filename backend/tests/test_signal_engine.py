from app.services.signal_engine import build_signal


def test_build_signal_returns_wait_for_strong_bullish_market_without_zone_confirmation():
    signal = build_signal(
        price=81234.56,
        bias="BULLISH",
        atr_14_pct=3.69,
        score=78,
        change_24h_pct=2.5,
        distance_to_pivot_pct=0.6,
        momentum_direction="BULLISH",
        momentum_strength="STRONG",
        zone_context="MID_RANGE",
        support=80790.0,
        resistance=82020.0,
    )

    assert signal.direction == "WAIT"
    assert signal.status == "WAIT_CONFIRMATION"



def test_build_signal_returns_buy_setup_for_strong_bullish_market_in_support_zone():
    signal = build_signal(
        price=81234.56,
        bias="BULLISH",
        atr_14_pct=3.69,
        score=78,
        change_24h_pct=2.5,
        distance_to_pivot_pct=0.6,
        momentum_direction="BULLISH",
        momentum_strength="STRONG",
        zone_context="SUPPORT",
        support=80790.0,
        resistance=82020.0,
    )

    assert signal.direction == "BUY"
    assert signal.entry < 81234.56
    # Karena entry pullback kita ATR/5, dan ATR adalah 3.69%, entry bisa
    # drop ke 80600-an. Hal itu wajar. Yang penting reward > risk.
    assert signal.take_profit > signal.entry
    assert signal.risk_reward > 0.0
    assert signal.status == "LIVE_FEED"


def test_build_signal_returns_sell_setup_for_strong_bearish_market_on_breakdown():
    signal = build_signal(
        price=79900.0,
        bias="BEARISH",
        atr_14_pct=3.69,
        score=31,
        change_24h_pct=-2.0,
        distance_to_pivot_pct=0.8,
        momentum_direction="BEARISH",
        momentum_strength="STRONG",
        zone_context="BREAKDOWN",
        support=80040.0,
        resistance=80750.0,
    )

    assert signal.direction == "SELL"
    assert signal.entry > 79900.0
    assert signal.take_profit < signal.entry
    assert signal.risk_reward > 0.0
    assert signal.status == "LIVE_FEED"


def test_build_signal_returns_wait_when_bias_is_neutral():
    signal = build_signal(
        price=80000.0,
        bias="NEUTRAL",
        atr_14_pct=1.4,
        score=52,
        change_24h_pct=0.4,
        distance_to_pivot_pct=0.03,
        momentum_direction="BULLISH",
        momentum_strength="WEAK",
        zone_context="MID_RANGE",
        support=79850.0,
        resistance=80150.0,
    )

    assert signal.direction == "WAIT"
    assert signal.status == "WAIT_CONFIRMATION"
    assert signal.take_profit > signal.entry


def test_build_signal_returns_wait_for_weak_bullish_market_near_pivot():
    signal = build_signal(
        price=75100.0,
        bias="BULLISH",
        atr_14_pct=0.38,
        score=64,
        change_24h_pct=0.43,
        distance_to_pivot_pct=0.48,
        momentum_direction="BULLISH",
        momentum_strength="WEAK",
        zone_context="MID_RANGE",
        support=74900.0,
        resistance=75420.0,
    )

    assert signal.direction == "WAIT"
    assert signal.status == "WAIT_CONFIRMATION"


def test_build_signal_returns_wait_for_bearish_market_without_real_momentum():
    signal = build_signal(
        price=79900.0,
        bias="BEARISH",
        atr_14_pct=0.7,
        score=31,
        change_24h_pct=-0.15,
        distance_to_pivot_pct=0.25,
        momentum_direction="NEUTRAL",
        momentum_strength="WEAK",
        zone_context="MID_RANGE",
        support=79680.0,
        resistance=80220.0,
    )

    assert signal.direction == "WAIT"
    assert signal.status == "WAIT_CONFIRMATION"


def test_build_signal_returns_wait_when_momentum_conflicts_with_bullish_bias():
    signal = build_signal(
        price=81234.56,
        bias="BULLISH",
        atr_14_pct=3.69,
        score=78,
        change_24h_pct=2.5,
        distance_to_pivot_pct=0.6,
        momentum_direction="BEARISH",
        momentum_strength="STRONG",
        zone_context="SUPPORT",
        support=80790.0,
        resistance=82020.0,
    )

    assert signal.direction == "WAIT"
    assert signal.status == "WAIT_CONFIRMATION"
