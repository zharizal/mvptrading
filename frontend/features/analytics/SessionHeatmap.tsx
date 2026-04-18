"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getSessions, type Period, type SessionsReport } from "./reports";
import { fNum, tone } from "./utils";

export function SessionHeatmap({ period }: { period: Period }) {
  const [data, setData] = useState<SessionsReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSessions(period)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [period]);

  if (err) return <Card className="border-red-500/20 text-terminal-red text-sm">{err}</Card>;
  if (!data) return <Card className="animate-pulse opacity-50"><div className="h-64" /></Card>;

  return (
    <Card>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-terminal-muted">
        Performance by Session (UTC)
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["asia", "london", "ny", "off"].map((s) => {
          const row = data.sessions.find((x) => x.session === s);
          if (!row) return null;
          return (
            <div key={s} className="rounded-xl border border-terminal-border bg-black/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terminal-muted">{s}</p>
              <p className={`mt-1 text-base font-semibold tabular-nums ${tone(row.net_pnl)}`}>
                ${fNum(row.net_pnl)}
              </p>
              <p className="text-[10px] text-terminal-muted">
                WR {fNum(row.win_rate)}% · {row.trade_count} trades
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-1">
        {data.hours.map((h) => {
          let bg = "bg-black/20";
          if (h.net_pnl > 0) bg = "bg-terminal-green/30";
          else if (h.net_pnl < 0) bg = "bg-terminal-red/30";

          return (
            <div
              key={h.hour}
              className={`flex h-12 w-6 flex-col items-center justify-end rounded-sm ${bg} hover:ring-1 hover:ring-terminal-cyan/50`}
              title={`${h.hour}:00 UTC — PnL: $${fNum(h.net_pnl)} (${h.trade_count} trades)`}
            >
              <span className="mb-1 text-[8px] text-terminal-muted/80">{h.hour}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
