"""Log every non-WAIT signal into `signal_events` with debounce.

Debounce rule: for a given (symbol, direction) pair, insert a new row only
if the previous row is older than `ttl_seconds` OR does not exist. This
prevents spam when a signal stays BUY for many consecutive ticks.

Called from the market poller on every successful snapshot.
"""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, select

from app.core.database import SessionLocal
from app.db.models import SignalEvent
from app.schemas import SnapshotResponse

_DEFAULT_TTL_SECONDS = 300.0  # 5 minutes
_lock = threading.Lock()
# Cache: symbol -> (direction, inserted_at_utc). Avoids a DB round-trip on
# every tick; DB is still authoritative for crash-safety.
_last_emitted: dict[str, tuple[str, datetime]] = {}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def log_if_new(snapshot: SnapshotResponse, *, ttl_seconds: float = _DEFAULT_TTL_SECONDS) -> bool:
    """Insert a `signal_events` row if the signal changed or cooled past TTL.

    Returns True when a row was inserted, False when skipped.
    """
    signal = snapshot.signal
    if signal.direction not in ("BUY", "SELL"):
        return False

    symbol = snapshot.resolved_symbol
    now = _utcnow()
    min_age = timedelta(seconds=ttl_seconds)

    with _lock:
        cached = _last_emitted.get(symbol)
        if cached is not None:
            prev_direction, prev_at = cached
            if prev_direction == signal.direction and (now - prev_at) < min_age:
                return False

    # DB-side check: confirm there's no recent row for this (symbol, direction).
    try:
        with SessionLocal() as db:
            stmt = (
                select(SignalEvent)
                .where(SignalEvent.symbol == symbol)
                .where(SignalEvent.direction == signal.direction)
                .order_by(desc(SignalEvent.created_at))
                .limit(1)
            )
            last_row = db.execute(stmt).scalar_one_or_none()
            if last_row is not None:
                last_at = last_row.created_at
                if last_at is not None:
                    if last_at.tzinfo is None:
                        last_at = last_at.replace(tzinfo=timezone.utc)
                    if (now - last_at) < min_age:
                        with _lock:
                            _last_emitted[symbol] = (signal.direction, last_at)
                        return False

            row = SignalEvent(
                symbol=symbol,
                direction=signal.direction,
                price_at_signal=snapshot.price,
                entry=signal.entry,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit,
                zone_context=snapshot.zone_context,
                score=snapshot.score,
                bias=snapshot.bias,
                outcome="pending",
                created_at=now,
            )
            db.add(row)
            db.commit()
    except Exception:
        # Don't let a DB hiccup take down the poller hot path.
        return False

    with _lock:
        _last_emitted[symbol] = (signal.direction, now)
    return True


def _reset_cache_for_tests() -> None:  # pragma: no cover - helper
    with _lock:
        _last_emitted.clear()
