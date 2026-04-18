"""Trade journal CRUD — raw SQLAlchemy (sync).

All datetimes are stored as timezone-aware UTC. Tags are persisted as JSON
strings in a single TEXT column.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Trade
from app.domain.journal import TradeCreate, TradeRead, TradeUpdate


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _status(row: Trade) -> str:
    return "closed" if row.exit_price is not None else "open"


def _decode_tags(raw: Optional[str]) -> Optional[list[str]]:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else None
    except (json.JSONDecodeError, TypeError):
        return None


def _encode_tags(tags: Optional[list[str]]) -> Optional[str]:
    if tags is None:
        return None
    return json.dumps(list(tags))


def row_to_read(row: Trade) -> TradeRead:
    return TradeRead(
        id=row.id,
        symbol=row.symbol,
        direction=row.direction,  # type: ignore[arg-type]
        entry_price=row.entry_price,
        exit_price=row.exit_price,
        size=row.size,
        stop_loss=row.stop_loss,
        take_profit=row.take_profit,
        entry_time=_ensure_aware(row.entry_time),
        exit_time=_ensure_aware(row.exit_time) if row.exit_time else None,
        pnl=row.pnl,
        r_multiple=row.r_multiple,
        notes=row.notes,
        tags=_decode_tags(row.tags),
        setup_quality=row.setup_quality,
        emotion=row.emotion,
        status=_status(row),  # type: ignore[arg-type]
        created_at=_ensure_aware(row.created_at) if row.created_at else _utcnow(),
        updated_at=_ensure_aware(row.updated_at) if row.updated_at else _utcnow(),
    )


def create(db: Session, payload: TradeCreate) -> Trade:
    now = _utcnow()
    row = Trade(
        symbol=payload.symbol,
        direction=payload.direction,
        entry_price=payload.entry_price,
        exit_price=None,
        size=payload.size,
        stop_loss=payload.stop_loss,
        take_profit=payload.take_profit,
        entry_time=payload.entry_time or now,
        exit_time=None,
        notes=payload.notes,
        tags=_encode_tags(payload.tags),
        setup_quality=payload.setup_quality,
        emotion=payload.emotion,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get(db: Session, trade_id: int) -> Optional[Trade]:
    return db.get(Trade, trade_id)


def list_trades(
    db: Session,
    *,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    limit: int = 100,
) -> tuple[list[Trade], int]:
    stmt = select(Trade).order_by(Trade.entry_time.desc())
    if status == "open":
        stmt = stmt.where(Trade.exit_price.is_(None))
    elif status == "closed":
        stmt = stmt.where(Trade.exit_price.is_not(None))
    if symbol:
        stmt = stmt.where(Trade.symbol == symbol.upper())
    rows = list(db.execute(stmt.limit(limit)).scalars().all())

    # Total ignores limit (simple recount — fine for MVP-scale).
    count_stmt = select(Trade)
    if status == "open":
        count_stmt = count_stmt.where(Trade.exit_price.is_(None))
    elif status == "closed":
        count_stmt = count_stmt.where(Trade.exit_price.is_not(None))
    if symbol:
        count_stmt = count_stmt.where(Trade.symbol == symbol.upper())
    total = len(list(db.execute(count_stmt).scalars().all()))
    return rows, total


def update(db: Session, trade_id: int, payload: TradeUpdate) -> Optional[Trade]:
    row = db.get(Trade, trade_id)
    if row is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    if "tags" in data:
        row.tags = _encode_tags(data.pop("tags"))
    for field, value in data.items():
        setattr(row, field, value)
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session, trade_id: int) -> bool:
    row = db.get(Trade, trade_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
