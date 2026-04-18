from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.journal import router as journal_router
from app.api.lessons import router as lessons_router
from app.api.symbols import router as symbols_router
from app.config import get_settings
from app.core.database import SessionLocal, init_db
from app.routers.health import router as health_router
from app.routers.snapshot import router as snapshot_router
from app.routers.ws import router as ws_router
from app.services.market_poller import registry as poller_registry
from app.services.symbols.catalog import seed_symbols
from app.services.reports.outcome_tracker import run_tracker
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    # Init DB + seed catalog before accepting traffic.
    init_db()
    with SessionLocal() as db:
        seed_symbols(db)

    # Start outcome tracker task
    tracker_task = asyncio.create_task(run_tracker())

    try:
        yield
    finally:
        tracker_task.cancel()
        await poller_registry.shutdown()


settings = get_settings()
app = FastAPI(title="Trading Terminal MVP API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(snapshot_router)
app.include_router(ws_router)
app.include_router(symbols_router)
app.include_router(journal_router)
app.include_router(analytics_router)
app.include_router(lessons_router)
