import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.schemas import SnapshotResponse, seeded_snapshot
from app.services.market_feed import get_live_market_snapshot
from app.websocket_manager import manager

router = APIRouter()


def _current_snapshot(symbol: str) -> SnapshotResponse:
    try:
        return get_live_market_snapshot(symbol)
    except Exception:
        return seeded_snapshot(symbol)


@router.websocket("/ws/market")
async def market_ws(websocket: WebSocket) -> None:
    settings = get_settings()
    requested_symbol = websocket.query_params.get("symbol") or settings.symbol
    await manager.connect(websocket)
    try:
        while True:
            snapshot = _current_snapshot(requested_symbol)
            await websocket.send_json(snapshot.model_dump(mode="json"))
            await asyncio.sleep(5)
    except (WebSocketDisconnect, RuntimeError):
        manager.disconnect(websocket)
