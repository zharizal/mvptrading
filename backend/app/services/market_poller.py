"""Background poller that fetches Binance snapshots once per symbol and
broadcasts to all subscribed WebSocket clients.

Design:
- One asyncio.Task per symbol with at least one subscriber.
- First WS client to subscribe to a symbol spins the task up.
- Task sleeps `poll_interval_seconds` between ticks; each tick fetches a fresh
  snapshot via `get_live_market_snapshot` (run in a worker thread to keep the
  event loop free) and broadcasts to every subscriber of that symbol.
- If the Binance fetch fails, a seeded fallback snapshot is broadcast instead
  so clients still receive a payload with `symbol_mode="fallback"`.
- When the last subscriber for a symbol disconnects, the task is cancelled
  and removed. Prevents idle pollers from hammering Binance.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import WebSocket

from app.config import get_settings
from app.schemas import SnapshotResponse, seeded_snapshot
from app.services.market_feed import get_live_market_snapshot
from app.services.market import signal_logger


class SymbolPoller:
    def __init__(self, symbol: str, interval: float) -> None:
        self.symbol = symbol
        self.interval = interval
        self.subscribers: set[WebSocket] = set()
        self.latest: Optional[SnapshotResponse] = None
        self.task: Optional[asyncio.Task[None]] = None

    async def _fetch_snapshot(self) -> SnapshotResponse:
        try:
            return await asyncio.to_thread(get_live_market_snapshot, self.symbol)
        except Exception:
            return seeded_snapshot(self.symbol)

    async def _loop(self) -> None:
        # Sleep first so the initial WS payload (sent by ws router) isn't
        # immediately clobbered. Subsequent ticks broadcast to all subscribers.
        try:
            while True:
                await asyncio.sleep(self.interval)
                if not self.subscribers:
                    continue
                snapshot = await self._fetch_snapshot()
                self.latest = snapshot

                # Background signal logging
                if snapshot.signal.direction in ("BUY", "SELL"):
                    await asyncio.to_thread(signal_logger.log_if_new, snapshot)

                await self._broadcast(snapshot)
        except asyncio.CancelledError:
            return

    async def _broadcast(self, snapshot: SnapshotResponse) -> None:
        payload = snapshot.model_dump(mode="json")
        dead: list[WebSocket] = []
        for ws in list(self.subscribers):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.subscribers.discard(ws)


class PollerRegistry:
    def __init__(self) -> None:
        self._pollers: dict[str, SymbolPoller] = {}
        self._lock = asyncio.Lock()

    def get_cached(self, symbol: str) -> Optional[SnapshotResponse]:
        poller = self._pollers.get(symbol)
        return poller.latest if poller else None

    async def subscribe(self, symbol: str, websocket: WebSocket) -> None:
        async with self._lock:
            poller = self._pollers.get(symbol)
            if poller is None:
                interval = get_settings().poll_interval_seconds
                poller = SymbolPoller(symbol, interval)
                self._pollers[symbol] = poller
                poller.task = asyncio.create_task(poller._loop())
            poller.subscribers.add(websocket)

    async def unsubscribe(self, symbol: str, websocket: WebSocket) -> None:
        async with self._lock:
            poller = self._pollers.get(symbol)
            if poller is None:
                return
            poller.subscribers.discard(websocket)
            if not poller.subscribers:
                if poller.task is not None:
                    poller.task.cancel()
                self._pollers.pop(symbol, None)

    async def shutdown(self) -> None:
        async with self._lock:
            for poller in self._pollers.values():
                if poller.task is not None:
                    poller.task.cancel()
            self._pollers.clear()

    # Test-friendly helpers
    def _reset_for_tests(self) -> None:
        for poller in self._pollers.values():
            if poller.task is not None:
                poller.task.cancel()
        self._pollers.clear()


registry = PollerRegistry()
