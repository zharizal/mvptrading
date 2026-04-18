"""Prompts for LLM logic."""
from __future__ import annotations


def build_lesson_prompt(
    period_label: str,
    trade_count: int,
    win_rate: float,
    net_r: float,
    trades_data: list[dict],
) -> str:
    return (
        f"You are a professional trading coach reviewing a student's journal for the last {period_label}.\n"
        f"Metrics: {trade_count} trades | {win_rate:.1f}% win rate | Net {net_r:+.2f}R\n\n"
        f"Trade log:\n{trades_data}\n\n"
        "Analyze these trades. Look for:\n"
        "- What setups/symbols are working best (strengths)?\n"
        "- What emotions or management errors caused unnecessary losses (weaknesses)?\n"
        "- Any recurring patterns (e.g. 'You FOMO into breakouts but win on support bounces')?\n"
        "- Actionable advice for next week.\n\n"
        "Return ONLY a JSON object with exactly this schema:\n"
        "{\n"
        '  "summary": "1-2 paragraph overview of performance and psychology.",\n'
        '  "strengths": ["list", "of", "2-3 points"],\n'
        '  "weaknesses": ["list", "of", "2-3 points"],\n'
        '  "patterns": ["list", "of", "2-3 observations"],\n'
        '  "recommendations": ["list", "of", "2-3 actionable rules"]\n'
        "}\n"
    )
