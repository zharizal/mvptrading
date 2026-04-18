"""Journal business logic — trade close, PnL/R computation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Trade
from app.domain.journal import TradeClose
from app.services.journal import repository


def compute_pnl(direction: str, entry_price: float, exit_price: float, size: float) -> float:
    """PnL in quote currency.

    `size` is interpreted as quote-currency notional. Quantity = size / entry_price.
    BUY:  pnl = (exit - entry) * quantity
    SELL: pnl = (entry - exit) * quantity
    """
    if entry_price <= 0:
        return 0.0
    quantity = size / entry_price
    if direction == "BUY":
        return (exit_price - entry_price) * quantity
    if direction == "SELL":
        return (entry_price - exit_price) * quantity
    return 0.0


def compute_r_multiple(
    direction: str,
    entry_price: float,
    exit_price: float,
    stop_loss: Optional[float],
) -> Optional[float]:
    """R-multiple = profit-in-price / risk-in-price, signed so hitting TP is positive.

    Returns None when SL is missing or risk is degenerate.
    """
    if stop_loss is None or stop_loss <= 0:
        return None
    if direction == "BUY":
        risk = entry_price - stop_loss
        reward = exit_price - entry_price
    elif direction == "SELL":
        risk = stop_loss - entry_price
        reward = entry_price - exit_price
    else:
        return None
    if risk <= 0:
        return None
    return reward / risk


def close_trade(db: Session, trade_id: int, payload: TradeClose) -> Optional[Trade]:
    row = repository.get(db, trade_id)
    if row is None:
        return None
    if row.exit_price is not None:
        # Already closed — idempotent update of exit values
        pass

    exit_time = payload.exit_time or datetime.now(timezone.utc)
    pnl = compute_pnl(row.direction, row.entry_price, payload.exit_price, row.size)
    r_multiple = compute_r_multiple(row.direction, row.entry_price, payload.exit_price, row.stop_loss)

    row.exit_price = payload.exit_price
    row.exit_time = exit_time
    row.pnl = pnl
    row.r_multiple = r_multiple
    row.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)
    return row
