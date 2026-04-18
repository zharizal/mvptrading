"""Background task to resolve pending signals."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.db.models import SignalEvent
from app.providers import registry

logger = logging.getLogger(__name__)


def _resolve_pending() -> None:
    try:
        with SessionLocal() as db:
            stmt = select(SignalEvent).where(SignalEvent.outcome == "pending")
            pending = db.execute(stmt).scalars().all()
            if not pending:
                return

            now = datetime.now(timezone.utc)
            for row in pending:
                # Expire if older than 24h
                created = row.created_at.replace(tzinfo=timezone.utc) if row.created_at else now
                if now - created > timedelta(hours=24):
                    row.outcome = "expired"
                    row.outcome_at = now
                    continue

                # Fetch live data explicitly to get candles (high/low).
                try:
                    provider, canonical = registry.resolve(row.symbol)
                    ticker, candles = provider.fetch_market_context(canonical)

                    if not candles:
                        continue

                    # Use the latest candle's high/low to determine hits instead of a point-in-time price
                    latest_candle = candles[-1]
                    high_price = latest_candle["high"]
                    low_price = latest_candle["low"]

                    if row.direction == "BUY":
                        if high_price >= row.take_profit:
                            row.outcome = "hit_tp"
                            row.outcome_price = row.take_profit
                            row.outcome_at = now
                        elif low_price <= row.stop_loss:
                            row.outcome = "hit_sl"
                            row.outcome_price = row.stop_loss
                            row.outcome_at = now
                    elif row.direction == "SELL":
                        if low_price <= row.take_profit:
                            row.outcome = "hit_tp"
                            row.outcome_price = row.take_profit
                            row.outcome_at = now
                        elif high_price >= row.stop_loss:
                            row.outcome = "hit_sl"
                            row.outcome_price = row.stop_loss
                            row.outcome_at = now
                except Exception:
                    continue  # skip this symbol on fetch error

            db.commit()
    except Exception as e:
        logger.error(f"Error resolving pending signals: {e}")

async def run_tracker(interval: float = 60.0) -> None:
    """Loop indefinitely, resolving pending signals."""
    try:
        while True:
            await asyncio.sleep(interval)
            await asyncio.to_thread(_resolve_pending)
    except asyncio.CancelledError:
        pass
