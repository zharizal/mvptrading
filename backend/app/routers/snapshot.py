from fastapi import APIRouter, Query

from app.config import get_settings
from app.schemas import SnapshotResponse, seeded_snapshot
from app.services.market_feed import get_live_market_snapshot

router = APIRouter()


@router.get("/snapshot", response_model=SnapshotResponse)
def snapshot(symbol: str | None = Query(default=None)) -> SnapshotResponse:
    settings = get_settings()
    effective_symbol = symbol or settings.symbol

    try:
        return get_live_market_snapshot(effective_symbol)
    except Exception:
        return seeded_snapshot(effective_symbol)
