from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.health import router as health_router
from app.routers.snapshot import router as snapshot_router
from app.routers.ws import router as ws_router

settings = get_settings()
app = FastAPI(title="Trading Terminal MVP API")
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
