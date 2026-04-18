import { MarketSnapshot } from "@/lib/types";

const directionTone = {
  BUY: "text-terminal-green",
  SELL: "text-terminal-red",
  WAIT: "text-yellow-200",
};

const zoneTone = {
  SUPPORT: "border-green-500/20 bg-green-500/10 text-terminal-green",
  RESISTANCE: "border-red-500/20 bg-red-500/10 text-terminal-red",
  BREAKOUT: "border-cyan-500/20 bg-cyan-500/10 text-terminal-cyan",
  BREAKDOWN: "border-red-500/20 bg-red-500/10 text-terminal-red",
  MID_RANGE: "border-terminal-border bg-black/10 text-terminal-muted",
};

function getStopContext(snapshot: MarketSnapshot) {
  if (snapshot.signal.direction === "BUY") {
    return snapshot.signal.stop_loss < snapshot.support ? "Below support" : "ATR buffered";
  }

  if (snapshot.signal.direction === "SELL") {
    if (snapshot.signal.stop_loss > snapshot.resistance) return "Above resistance";
    if (snapshot.signal.stop_loss > snapshot.support) return "Above broken support";
  }

  return "ATR buffered";
}

function getTakeProfitContext(snapshot: MarketSnapshot) {
  if (snapshot.signal.direction === "BUY") {
    return snapshot.signal.take_profit < snapshot.resistance ? "Capped by resistance" : "ATR projected";
  }

  if (snapshot.signal.direction === "SELL") {
    return snapshot.signal.take_profit > snapshot.support ? "Capped before support" : "ATR projected";
  }

  return snapshot.zone_context === "MID_RANGE" ? "Awaiting confirmation" : "Structure-aware";
}

export function TradeSetupPanel({ snapshot }: { snapshot: MarketSnapshot }) {
  const rows = [
    ["Direction", snapshot.signal.direction],
    ["Entry", snapshot.signal.entry.toFixed(5)],
    ["Stop Loss", snapshot.signal.stop_loss.toFixed(5)],
    ["Take Profit", snapshot.signal.take_profit.toFixed(5)],
    ["R/R", snapshot.signal.risk_reward.toFixed(2)],
    ["Status", snapshot.signal.status],
  ] as const;

  const stopContext = getStopContext(snapshot);
  const takeProfitContext = getTakeProfitContext(snapshot);

  return (
    <section className="rounded border border-terminal-border bg-terminal-panel p-3">
      <div className="mb-3 flex items-center justify-between border-b border-terminal-border pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">Trade Setup</h2>
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${directionTone[snapshot.signal.direction]}`}>
          {snapshot.signal.direction}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${zoneTone[snapshot.zone_context]}`}>
          {snapshot.zone_context}
        </span>
      </div>

      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-white/5">
            <div>
              <span className="text-terminal-muted">{label}</span>
              {label === "Stop Loss" ? <p className="text-[9px] uppercase tracking-widest text-terminal-muted/60">{stopContext}</p> : null}
              {label === "Take Profit" ? <p className="text-[9px] uppercase tracking-widest text-terminal-muted/60">{takeProfitContext}</p> : null}
            </div>
            <span className={`font-medium tabular-nums ${label === "Direction" ? directionTone[snapshot.signal.direction] : "text-terminal-text"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
