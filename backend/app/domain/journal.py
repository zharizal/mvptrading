"""Journal (trade log) Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

TradeDirection = Literal["BUY", "SELL"]
TradeStatus = Literal["open", "closed"]
TradeEmotion = Literal["confident", "fomo", "revenge", "fear", "neutral"]


class TradeCreate(BaseModel):
    symbol: str = Field(min_length=2, max_length=32)
    direction: TradeDirection
    entry_price: float = Field(gt=0)
    size: float = Field(gt=0, description="Position size in quote currency")
    stop_loss: Optional[float] = Field(default=None, gt=0)
    take_profit: Optional[float] = Field(default=None, gt=0)
    entry_time: Optional[datetime] = Field(
        default=None, description="Defaults to now (UTC) if omitted"
    )
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    setup_quality: Optional[int] = Field(default=None, ge=1, le=5)
    emotion: Optional[TradeEmotion] = None

    @field_validator("symbol")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class TradeUpdate(BaseModel):
    """Partial update for metadata. Does NOT close the trade — use the close endpoint."""
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    setup_quality: Optional[int] = Field(default=None, ge=1, le=5)
    emotion: Optional[TradeEmotion] = None
    stop_loss: Optional[float] = Field(default=None, gt=0)
    take_profit: Optional[float] = Field(default=None, gt=0)


class TradeClose(BaseModel):
    exit_price: float = Field(gt=0)
    exit_time: Optional[datetime] = Field(default=None)


class TradeRead(BaseModel):
    id: int
    symbol: str
    direction: TradeDirection
    entry_price: float
    exit_price: Optional[float]
    size: float
    stop_loss: Optional[float]
    take_profit: Optional[float]
    entry_time: datetime
    exit_time: Optional[datetime]
    pnl: Optional[float]
    r_multiple: Optional[float]
    notes: Optional[str]
    tags: Optional[list[str]]
    setup_quality: Optional[int]
    emotion: Optional[str]
    status: TradeStatus
    created_at: datetime
    updated_at: datetime


class TradeList(BaseModel):
    items: list[TradeRead]
    total: int
