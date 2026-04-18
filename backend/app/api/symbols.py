"""GET /symbols — list enabled tradable instruments grouped by asset class."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.services.symbols import service as symbols_service

router = APIRouter(tags=["symbols"])


class SymbolRead(BaseModel):
    canonical_symbol: str
    display_name: str
    asset_class: Literal["crypto", "forex", "commodity"]
    provider: str
    base_ccy: str
    quote_ccy: str
    pip_size: float | None
    tradingview_symbol: str | None
    url_symbol: str = Field(description="URL-safe identifier (slashes replaced with dashes).")


class SymbolGroup(BaseModel):
    asset_class: Literal["crypto", "forex", "commodity"]
    symbols: list[SymbolRead]


class SymbolsResponse(BaseModel):
    groups: list[SymbolGroup]
    total: int


def _row_to_read(row) -> SymbolRead:
    return SymbolRead(
        canonical_symbol=row.canonical_symbol,
        display_name=row.display_name,
        asset_class=row.asset_class,
        provider=row.provider,
        base_ccy=row.base_ccy,
        quote_ccy=row.quote_ccy,
        pip_size=row.pip_size,
        tradingview_symbol=row.tradingview_symbol,
        url_symbol=symbols_service.canonical_to_url(row.canonical_symbol),
    )


@router.get("/symbols", response_model=SymbolsResponse)
def list_symbols(db: Session = Depends(get_db)) -> SymbolsResponse:
    rows = symbols_service.list_enabled(db)
    grouped: dict[str, list[SymbolRead]] = {}
    for row in rows:
        grouped.setdefault(row.asset_class, []).append(_row_to_read(row))

    # Keep a deterministic group order regardless of what exists in DB.
    order = ["crypto", "commodity", "forex"]
    groups = [
        SymbolGroup(asset_class=cls, symbols=grouped[cls])  # type: ignore[arg-type]
        for cls in order
        if cls in grouped
    ]
    return SymbolsResponse(groups=groups, total=len(rows))


@router.get("/symbols/{url_symbol}", response_model=SymbolRead)
def get_symbol(url_symbol: str, db: Session = Depends(get_db)) -> SymbolRead:
    canonical = symbols_service.url_to_canonical(url_symbol)
    row = symbols_service.get_by_canonical(db, canonical)
    if row is None or row.enabled != 1:
        raise HTTPException(status_code=404, detail=f"Unknown symbol: {canonical}")
    return _row_to_read(row)
