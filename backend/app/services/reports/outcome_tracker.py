"""Background task to resolve pending signals."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.db.models import SignalEvent
from app.services.market_feed import get_live_market_snapshot

logger = logging.getLogger(__name__)

async def _resolve_pending() -> None:
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

                # Fetch live price. (Ideally we'd use the poller cache if active,
                # but fetching is fine for MVP background task).
                try:
                    snap = get_live_market_snapshot(row.symbol)
                    current_price = snap.price

                    if row.direction == "BUY":
                        if current_price >= row.take_profit:
                            row.outcome = "hit_tp"
                            row.outcome_price = current_price
                            row.outcome_at = now
                        elif current_price <= row.stop_loss:
                            row.outcome = "hit_sl"
                            row.outcome_price = current_price
                            row.outcome_at = now
                    elif row.direction == "SELL":
                        if current_price <= row.take_profit:
                            row.outcome = "hit_tp"
                            row.outcome_price = current_price
                            row.outcome_at = now
                        elif current_price >= row.stop_loss:
                            row.outcome = "hit_sl"
                            row.outcome_price = current_price
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
