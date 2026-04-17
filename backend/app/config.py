from functools import lru_cache
import os
from pydantic import BaseModel


class Settings(BaseModel):
    app_host: str = os.getenv("APP_HOST", "127.0.0.1")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000").split(",")
        if origin.strip()
    ]
    symbol: str = os.getenv("SYMBOL", "BTCUSDT")


@lru_cache
def get_settings() -> Settings:
    return Settings()
