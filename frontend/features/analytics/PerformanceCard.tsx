"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getPerformance, type PerformanceReport, type Period } from "./reports";
import { fNum, tone } from "./utils";

export function PerformanceCard({ period }: { period: Period }) {
  const [data, setData] = useState<PerformanceReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getPerformance(period)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [period]);

  if (err) return <Card className="border-red-500/20 text-terminal-red text-sm">{err}</Card>;
  if (!data) return <Card className="animate-pulse opacity-50"><div className="h-64" /></Card>;

  return (
    <Card>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-terminal-muted">
        Journal Performance
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Metric label="Net PnL" val={`$${fNum(data.net_pnl)}`} cls={tone(data.net_pnl)} />
        <Metric label="Win Rate" val={`${fNum(data.win_rate)}%`} />
        <Metric label="Profit Factor" val={fNum(data.profit_factor)} />
        <Metric label="Expectancy (R)" val={fNum(data.expectancy_r)} cls={tone(data.expectancy_r)} />
        <Metric label="Total Trades" val={String(data.total_trades)} />
        <Metric label="Closed / Open" val={`${data.closed_trades} / ${data.open_trades}`} />
        <Metric label="Best R" val={fNum(data.best_r)} cls="text-terminal-green" />
        <Metric label="Max Drawdown" val={`-$${fNum(data.max_drawdown)}`} cls="text-terminal-red" />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-terminal-border text-terminal-muted uppercase tracking-[0.1em]">
            <tr>
              <th className="py-2 text-left font-medium">Symbol</th>
              <th className="py-2 text-right font-medium">Trades</th>
              <th className="py-2 text-right font-medium">WR %</th>
              <th className="py-2 text-right font-medium">Net R</th>
              <th className="py-2 text-right font-medium">Net PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border/50">
            {data.per_symbol.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-center text-terminal-muted">No closed trades</td></tr>
            ) : (
              data.per_symbol.map(s => (
                <tr key={s.symbol}>
                  <td className="py-2 font-medium">{s.symbol}</td>
                  <td className="py-2 text-right">{s.trade_count}</td>
                  <td className="py-2 text-right">{fNum(s.win_rate)}%</td>
                  <td className={`py-2 text-right ${tone(s.net_r)}`}>{fNum(s.net_r)}R</td>
                  <td className={`py-2 text-right font-semibold ${tone(s.net_pnl)}`}>{fNum(s.net_pnl)}</td>
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
