from app.services.reasoning import build_reasoning


def test_build_reasoning_explains_bullish_market_with_confirmation_language():
    reasoning = build_reasoning(
        symbol="BTCUSDT",
        bias="BULLISH",
        score=78,
        change_24h_pct=2.5,
        atr_14_pct=3.69,
        pivot=80744.85,
        price=81234.56,
        support=80450.0,
        resistance=82000.0,
        zone_context="SUPPORT",
        signal_direction="BUY",
    )

    assert "BTCUSDT" in reasoning
    assert "bullish" in reasoning.lower()
    assert "78/100" in reasoning
    assert "support" in reasoning.lower()
    assert len(reasoning.split(". ")) <= 5


def test_build_reasoning_explains_neutral_market_without_forcing_trade():
    reasoning = build_reasoning(
        symbol="BTCUSDT",
        bias="NEUTRAL",
        score=52,
        change_24h_pct=0.4,
        atr_14_pct=1.2,
        pivot=80010.0,
        price=79990.0,
        support=79880.0,
        resistance=80120.0,
        zone_context="MID_RANGE",
        signal_direction="WAIT",
    )

    assert "neutral" in reasoning.lower()
    assert "wait" in reasoning.lower() or "confirmation" in reasoning.lower()
