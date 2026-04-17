from app.schemas import Bias, Direction, ZoneContext


def build_reasoning(
    symbol: str,
    bias: Bias,
    score: int,
    change_24h_pct: float,
    atr_14_pct: float,
    pivot: float,
    price: float,
    support: float,
    resistance: float,
    zone_context: ZoneContext,
    signal_direction: Direction,
) -> str:
    sentiment = bias.lower()
    direction_text = signal_direction.lower()
    distance_pct = abs(price - pivot) / price * 100

    sentence_1 = (
        f"{symbol} currently shows a {sentiment} intraday bias with score {score}/100 and 24h change {change_24h_pct:.2f}%."
    )
    sentence_2 = (
        f"Price is {distance_pct:.2f}% away from pivot {pivot:.2f}, while ATR reads {atr_14_pct:.2f}%."
    )
    sentence_3 = (
        f"Recent structure puts support near {support:.2f}, resistance near {resistance:.2f}, with zone context {zone_context.lower()}."
    )

    if signal_direction == "BUY":
        sentence_4 = "Setup leans buy, but entry still benefits from confirmation near support or continuation strength."
    elif signal_direction == "SELL":
        sentence_4 = "Setup leans sell, but downside confirmation is still preferred before pressing size."
    else:
        sentence_4 = "Current setup is neutral, so waiting for confirmation is cleaner than forcing a trade."

    sentence_5 = f"Current signal stance: {direction_text}."
    return " ".join([sentence_1, sentence_2, sentence_3, sentence_4, sentence_5])
