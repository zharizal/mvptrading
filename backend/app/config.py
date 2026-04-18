from functools import lru_cache
import os
from pathlib import Path

from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:  # pragma: no cover - dotenv is optional
    pass


def _split_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class Settings(BaseModel):
    app_host: str = Field(default_factory=lambda: os.getenv("APP_HOST", "127.0.0.1"))
    app_port: int = Field(default_factory=lambda: int(os.getenv("APP_PORT", "8000")))
    cors_origins: list[str] = Field(
        default_factory=lambda: _split_origins(
            os.getenv("CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000")
        )
    )
    symbol: str = Field(default_factory=lambda: os.getenv("SYMBOL", "BTCUSDT"))
    openrouter_api_key: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "").strip()
    )
    openrouter_base_url: str = Field(
        default_factory=lambda: os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )
    )
    openrouter_referer: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_REFERER", "").strip()
    )
    openrouter_app_name: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_APP_NAME", "mvptrading").strip()
    )
    llm_model: str = Field(
        default_factory=lambda: os.getenv("LLM_MODEL", "anthropic/claude-haiku-4.5")
    )
    poll_interval_seconds: float = Field(
        default_factory=lambda: float(os.getenv("POLL_INTERVAL_SECONDS", "5"))
    )
    poll_interval_forex_seconds: float = Field(
        default_factory=lambda: float(os.getenv("POLL_INTERVAL_FOREX_SECONDS", "30"))
    )
    twelvedata_api_key: str = Field(
        default_factory=lambda: os.getenv("TWELVEDATA_API_KEY", "").strip()
    )
    twelvedata_base_url: str = Field(
        default_factory=lambda: os.getenv(
            "TWELVEDATA_BASE_URL", "https://api.twelvedata.com"
        )
    )
    db_path: str = Field(
        default_factory=lambda: os.getenv("DB_PATH", "data/mvptrading.db")
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
