"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getMarketStats, type MarketStatsReport } from "./reports";
import { fNum, tone } from "./utils";

export function MarketStatsCard() {
  const [data, setData] = useState<MarketStatsReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getMarketStats()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, []);

  if (err) return <Card className="border-red-500/20 text-terminal-red text-sm">{err}</Card>;
  if (!data) return <Card className="animate-pulse opacity-50"><div className="h-64" /></Card>;

  return (
    <Card>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-terminal-muted">
        Live Market Snapshot
      </h3>
      <div className="grid gap-6 md:grid-cols-3">
        <Col title="Top Movers" items={data.top_gainers.filter(r => r.change_24h_pct > 0)} />
        <Col title="Top Losers" items={data.top_losers.filter(r => r.change_24h_pct < 0)} />
        <Col title="High Volatility (ATR%)" items={data.most_volatile} formatKey="atr_14_pct" suffix="%" />
      </div>
    </Card>
  );
}

function Col({ title, items, formatKey = "change_24h_pct", suffix = "%" }: any) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-[0.1em] text-terminal-muted border-b border-terminal-border pb-1 mb-2">
        {title}
      </h4>
      <div className="space-y-1">
        {items.length === 0 ? <p className="text-xs text-terminal-muted">—</p> : null}
        {items.map((r: any) => (
          <div key={r.symbol} className="flex justify-between text-sm">
            <span className="font-medium text-terminal-text">{r.symbol}</span>
            <span className={`tabular-nums ${formatKey.includes("change") ? tone(r[formatKey]) : "text-terminal-cyan"}`}>
              {formatKey.includes("change") && r[formatKey] > 0 ? "+" : ""}
              {fNum(r[formatKey])}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
