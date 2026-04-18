"use client";

import { useState } from "react";
import { AccuracyCard } from "./AccuracyCard";
import { MarketStatsCard } from "./MarketStatsCard";
import { PerformanceCard } from "./PerformanceCard";
import { SessionHeatmap } from "./SessionHeatmap";
import type { Period } from "./reports";

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>("30d");

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-terminal-muted">
          Dashboard
        </h2>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                period === p
                  ? "border-terminal-cyan bg-cyan-500/10 text-terminal-cyan"
                  : "border-terminal-border bg-black/10 text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceCard period={period} />
        <AccuracyCard period={period} />
        <SessionHeatmap period={period} />
        <MarketStatsCard />
      </div>
    </div>
  );
}
