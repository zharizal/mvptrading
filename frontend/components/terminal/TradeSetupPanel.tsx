import { MarketSnapshot } from "@/lib/types";
import { PremiumPanelHeader } from "./PremiumPanelHeader";

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
    ["Entry", snapshot.signal.entry.toFixed(2)],
    ["Stop Loss", snapshot.signal.stop_loss.toFixed(2)],
    ["Take Profit", snapshot.signal.take_profit.toFixed(2)],
    ["R/R", snapshot.signal.risk_reward.toFixed(2)],
    ["Status", snapshot.signal.status],
  ] as const;

  const stopContext = getStopContext(snapshot);
  const takeProfitContext = getTakeProfitContext(snapshot);

  return (
    <section className="premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <PremiumPanelHeader
        eyebrow="Execution Grid"
        title="Trade Setup"
        subtitle="Structure-aware levels with cleaner hierarchy for entry, risk, and target context."
        rightContent={<span className={`text-sm font-semibold ${directionTone[snapshot.signal.direction]}`}>{snapshot.signal.direction}</span>}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${zoneTone[snapshot.zone_context]}`}>
          Zone {snapshot.zone_context}
        </span>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-terminal-green">
          Support {snapshot.support.toLocaleString()}
        </span>
        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-terminal-red">
          Resistance {snapshot.resistance.toLocaleString()}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="premium-glass flex items-center justify-between rounded-xl border border-terminal-border bg-black/10 px-3 py-3 text-sm shadow-glow">
            <div>
              <span className="text-terminal-muted">{label}</span>
              {label === "Stop Loss" ? <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-terminal-muted">{stopContext}</p> : null}
              {label === "Take Profit" ? <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-terminal-muted">{takeProfitContext}</p> : null}
            </div>
            <span className={`font-medium ${label === "Direction" ? directionTone[snapshot.signal.direction] : "text-terminal-text"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
