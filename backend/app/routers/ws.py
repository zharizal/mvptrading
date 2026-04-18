from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import get_settings
from app.schemas import SnapshotResponse, seeded_snapshot
from app.services.market_feed import get_live_market_snapshot
from app.services.market_poller import registry

router = APIRouter()


def _current_snapshot(symbol: str) -> SnapshotResponse:
    try:
        return get_live_market_snapshot(symbol)
    except Exception:
        return seeded_snapshot(symbol)


@router.websocket("/ws/market")
async def market_ws(websocket: WebSocket) -> None:
    settings = get_settings()
    symbol = (websocket.query_params.get("symbol") or settings.symbol).upper()
    await websocket.accept()

    try:
        # Send an immediate snapshot so the UI has data before the first
        # poll tick lands. Prefer the cached snapshot from the shared poller
        # if a tick already ran — otherwise compute one on demand.
        cached = registry.get_cached(symbol)
        initial = cached if cached is not None else _current_snapshot(symbol)
        await websocket.send_json(initial.model_dump(mode="json"))

        await registry.subscribe(symbol, websocket)

        # Keep the connection open; poller handles subsequent broadcasts.
        # We loop on receive_text only to detect client disconnect.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await registry.unsubscribe(symbol, websocket)
