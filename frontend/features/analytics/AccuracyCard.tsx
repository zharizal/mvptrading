"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getAccuracy, type AccuracyReport, type Period } from "./reports";
import { fNum, tone } from "./utils";

export function AccuracyCard({ period, symbol }: { period: Period; symbol?: string }) {
  const [data, setData] = useState<AccuracyReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getAccuracy(period, symbol)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [period, symbol]);

  if (err) return <Card className="border-red-500/20 text-terminal-red text-sm">{err}</Card>;
  if (!data) return <Card className="animate-pulse opacity-50"><div className="h-64" /></Card>;

  return (
    <Card>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-terminal-muted">
        Signal Hit Rate
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Hit Rate (All)" val={`${fNum(data.hit_rate)}%`} cls={tone(data.hit_rate ? data.hit_rate - 50 : 0)} />
        <Metric label="Hit Rate (BUY)" val={`${fNum(data.buy_hit_rate)}%`} />
        <Metric label="Hit Rate (SELL)" val={`${fNum(data.sell_hit_rate)}%`} />
        <Metric label="Avg Time to TP/SL" val={data.avg_time_to_resolve_s ? `${Math.round(data.avg_time_to_resolve_s / 60)}m` : "—"} />
        <Metric label="Total Signals" val={String(data.total_signals)} />
        <Metric label="Hit TP" val={String(data.hit_tp)} cls="text-terminal-green" />
        <Metric label="Hit SL" val={String(data.hit_sl)} cls="text-terminal-red" />
        <Metric label="Pending/Expired" val={`${data.pending} / ${data.expired}`} />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-terminal-border text-terminal-muted uppercase tracking-[0.1em]">
            <tr>
              <th className="py-2 text-left font-medium">Symbol</th>
              <th className="py-2 text-right font-medium">Hit Rate</th>
              <th className="py-2 text-right font-medium">TP</th>
              <th className="py-2 text-right font-medium">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border/50">
            {data.per_symbol.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-terminal-muted">No signals logged</td></tr>
            ) : (
              data.per_symbol.map(s => (
                <tr key={s.symbol}>
                  <td className="py-2 font-medium">{s.symbol}</td>
                  <td className={`py-2 text-right ${tone(s.hit_rate ? s.hit_rate - 50 : 0)}`}>{fNum(s.hit_rate)}%</td>
                  <td className="py-2 text-right text-terminal-green">{s.hit_tp}</td>
                  <td className="py-2 text-right text-terminal-red">{s.hit_sl}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Metric({ label, val, cls = "text-terminal-text" }: { label: string; val: string; cls?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-terminal-muted">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${cls}`}>{val}</p>
    </div>
  );
}
