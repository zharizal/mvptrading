"""Thin OpenRouter wrapper for reasoning narratives.

Behavior:
- Disabled by default. Activates only when `OPENROUTER_API_KEY` is set.
- Caches output per (symbol, direction, zone, score_bucket) for 60 seconds to
  avoid re-calling on every 5-second market tick when nothing meaningful
  has moved.
- Any failure (network error, bad response, non-2xx) returns `None` so the
  caller falls back to the rule-based narrative.

OpenRouter exposes an OpenAI-compatible Chat Completions endpoint at
`{base}/chat/completions`. We use httpx directly to avoid pulling in an
additional SDK.
"""
from __future__ import annotations

import threading
import time
from typing import Optional

import httpx

from app.config import get_settings
from app.schemas import Bias, Direction, ZoneContext

_CACHE_TTL_SECONDS = 60.0
_REQUEST_TIMEOUT_SECONDS = 5.0
_MAX_TOKENS = 220

_cache_lock = threading.Lock()
_cache: dict[tuple[str, str, str, int], tuple[float, str]] = {}


def _score_bucket(score: int) -> int:
    # Bucket score to the nearest 5 to keep cache keys stable across micro-drift.
    return int(round(score / 5.0)) * 5


def _cache_key(symbol: str, signal_direction: Direction, zone_context: ZoneContext, score: int) -> tuple[str, str, str, int]:
    return (symbol, signal_direction, zone_context, _score_bucket(score))


def _render_prompt(
    symbol: str,
    bias: Bias,
    score: int,
    change_24h_pct: float,
    atr_14_pct: float,
    pivot: float,
    price: float,
    support: float,
    resistance: float,
    zone_context: ZoneContext,
    signal_direction: Direction,
) -> str:
    return (
        "You are a disciplined intraday crypto trader writing a short read on the current tape. "
        "Write 3-4 concise sentences (max 80 words total). No disclaimers, no bullet points, no emoji. "
        "Use professional trader voice — calm, specific, pragmatic. "
        "End with one sentence describing the actionable stance (buy / sell / wait).\n\n"
        "Snapshot:\n"
        f"- Symbol: {symbol}\n"
        f"- Bias: {bias} (score {score}/100)\n"
        f"- Price: {price:.2f}, 24h change: {change_24h_pct:.2f}%\n"
        f"- Pivot: {pivot:.2f}, ATR(14): {atr_14_pct:.2f}%\n"
        f"- Support: {support:.2f}, Resistance: {resistance:.2f}\n"
        f"- Zone: {zone_context}\n"
        f"- Signal direction: {signal_direction}\n"
    )


def _call_openrouter(
    api_key: str,
    base_url: str,
    model: str,
    prompt: str,
    referer: str,
    app_name: str,
    system: Optional[str] = None,
    response_format: Optional[dict] = None,
    max_tokens: int = _MAX_TOKENS,
) -> Optional[str]:
    """POST to OpenRouter chat completions; return text or None on failure."""
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    # Optional attribution headers
    if referer:
        headers["HTTP-Referer"] = referer
    if app_name:
        headers["X-Title"] = app_name

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if response_format:
        payload["response_format"] = response_format

    try:
        with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                return None
            data = response.json()
    except Exception:
        return None

    try:
        choices = data.get("choices") or []
        if not choices:
            return None
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, list):
            # Some providers return a list of content parts.
            parts = [p.get("text", "") for p in content if isinstance(p, dict)]
            text = " ".join(part.strip() for part in parts if part).strip()
        elif isinstance(content, str):
            text = content.strip()
        else:
            return None
    except Exception:
        return None

    return text or None


def try_llm_reasoning(
    symbol: str,
    bias: Bias,
    score: int,
    change_24h_pct: float,
    atr_14_pct: float,
    pivot: float,
    price: float,
    support: float,
    resistance: float,
    zone_context: ZoneContext,
    signal_direction: Direction,
) -> Optional[str]:
    settings = get_settings()
    api_key = settings.openrouter_api_key
    if not api_key:
        return None

    key = _cache_key(symbol, signal_direction, zone_context, score)
    now = time.monotonic()
    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None:
            cached_at, cached_text = cached
            if (now - cached_at) < _CACHE_TTL_SECONDS:
                return cached_text

    prompt = _render_prompt(
        symbol=symbol,
        bias=bias,
        score=score,
        change_24h_pct=change_24h_pct,
        atr_14_pct=atr_14_pct,
        pivot=pivot,
        price=price,
        support=support,
        resistance=resistance,
        zone_context=zone_context,
        signal_direction=signal_direction,
    )

    text = _call_openrouter(
        api_key=api_key,
        base_url=settings.openrouter_base_url,
        model=settings.llm_model,
        prompt=prompt,
        referer=settings.openrouter_referer,
        app_name=settings.openrouter_app_name,
    )
    if not text:
        return None

    with _cache_lock:
        _cache[key] = (now, text)
    return text


def _reset_cache_for_tests() -> None:  # pragma: no cover - helper
    with _cache_lock:
        _cache.clear()
