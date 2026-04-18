"""Tests for the LLM reasoning dispatcher — verifies LLM success path and
graceful fallback to the rule-based narrative when the LLM is unavailable.
"""
from __future__ import annotations

import pytest

from app.services import llm_client, reasoning
from app.config import get_settings


@pytest.fixture(autouse=True)
def _clear_cache_and_settings():
    llm_client._reset_cache_for_tests()
    get_settings.cache_clear()
    yield
    llm_client._reset_cache_for_tests()
    get_settings.cache_clear()


def _sample_kwargs() -> dict:
    return dict(
        symbol="BTCUSDT",
        bias="BULLISH",
        score=78,
        change_24h_pct=2.5,
        atr_14_pct=1.4,
        pivot=80744.85,
        price=81234.56,
        support=80450.0,
        resistance=82000.0,
        zone_context="SUPPORT",
        signal_direction="BUY",
    )


def _patch_openrouter(monkeypatch, text: str | None, *, counter: dict | None = None) -> None:
    """Patch the internal OpenRouter call to return a deterministic result."""

    def fake_call(**kwargs):  # noqa: ARG001
        if counter is not None:
            counter["n"] = counter.get("n", 0) + 1
        return text

    monkeypatch.setattr(llm_client, "_call_openrouter", fake_call)


def test_reasoning_falls_back_to_rule_based_when_api_key_missing(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    get_settings.cache_clear()

    text = reasoning.build_reasoning(**_sample_kwargs())

    assert "BTCUSDT" in text
    assert "78/100" in text  # rule-based narrative signature
    assert "bullish" in text.lower()


def test_reasoning_uses_llm_output_when_api_key_set(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    get_settings.cache_clear()

    _patch_openrouter(
        monkeypatch,
        "BTC holds pivot with soft momentum. Watch 80.5k support. Stance: buy.",
    )

    text = reasoning.build_reasoning(**_sample_kwargs())

    assert "Stance: buy" in text
    assert "78/100" not in text  # not rule-based


def test_reasoning_falls_back_when_llm_call_returns_none(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    get_settings.cache_clear()

    _patch_openrouter(monkeypatch, None)

    text = reasoning.build_reasoning(**_sample_kwargs())

    # Rule-based fallback signature
    assert "78/100" in text


def test_reasoning_caches_llm_output_across_ticks(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    get_settings.cache_clear()

    counter: dict = {"n": 0}
    _patch_openrouter(monkeypatch, "Cached narrative.", counter=counter)

    first = reasoning.build_reasoning(**_sample_kwargs())
    second = reasoning.build_reasoning(**_sample_kwargs())

    assert first == second == "Cached narrative."
    assert counter["n"] == 1  # second call hit the cache
