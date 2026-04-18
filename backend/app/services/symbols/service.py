"""Read-side symbol queries + helpers for canonical symbol parsing."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Symbol


def list_enabled(db: Session) -> list[Symbol]:
    stmt = (
        select(Symbol)
        .where(Symbol.enabled == 1)
        .order_by(Symbol.asset_class, Symbol.sort_order, Symbol.canonical_symbol)
    )
    return list(db.execute(stmt).scalars().all())


def get_by_canonical(db: Session, canonical: str) -> Optional[Symbol]:
    return db.get(Symbol, canonical)


def url_to_canonical(url_symbol: str) -> str:
    """Convert URL-safe dash form back to slash form.

    Examples:
      'BTC-USDT'  -> 'BTC/USDT'
      'XAU-USD'   -> 'XAU/USD'
      'BTCUSDT'   -> 'BTCUSDT'  (legacy Binance form, caller handles fallback)
    """
    return url_symbol.replace("-", "/").upper()


def canonical_to_url(canonical: str) -> str:
    """Convert canonical slash form to URL-safe dash form."""
    return canonical.replace("/", "-")
