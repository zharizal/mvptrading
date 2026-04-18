"""Journal API — CRUD + close endpoints for trades."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.domain.journal import (
    TradeClose,
    TradeCreate,
    TradeList,
    TradeRead,
    TradeUpdate,
)
from app.services.journal import repository
from app.services.journal.service import close_trade

router = APIRouter(prefix="/journal", tags=["journal"])


@router.get("/trades", response_model=TradeList)
def list_trades(
    status: Optional[Literal["open", "closed"]] = Query(default=None),
    symbol: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> TradeList:
    rows, total = repository.list_trades(db, status=status, symbol=symbol, limit=limit)
    return TradeList(items=[repository.row_to_read(r) for r in rows], total=total)


@router.post("/trades", response_model=TradeRead, status_code=201)
def create_trade(payload: TradeCreate, db: Session = Depends(get_db)) -> TradeRead:
    row = repository.create(db, payload)
    return repository.row_to_read(row)


@router.get("/trades/{trade_id}", response_model=TradeRead)
def get_trade(trade_id: int, db: Session = Depends(get_db)) -> TradeRead:
    row = repository.get(db, trade_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return repository.row_to_read(row)


@router.patch("/trades/{trade_id}", response_model=TradeRead)
def update_trade(
    trade_id: int, payload: TradeUpdate, db: Session = Depends(get_db)
) -> TradeRead:
    row = repository.update(db, trade_id, payload)
    if row is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return repository.row_to_read(row)


@router.post("/trades/{trade_id}/close", response_model=TradeRead)
def close(
    trade_id: int, payload: TradeClose, db: Session = Depends(get_db)
) -> TradeRead:
    row = close_trade(db, trade_id, payload)
    if row is None:
        raise HTTPException(status_code=404, detail="Trade not found")
    return repository.row_to_read(row)


@router.delete("/trades/{trade_id}", status_code=204)
def delete_trade(trade_id: int, db: Session = Depends(get_db)) -> None:
    ok = repository.delete(db, trade_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Trade not found")
