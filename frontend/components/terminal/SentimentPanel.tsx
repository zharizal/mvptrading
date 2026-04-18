import { MarketSnapshot } from "@/lib/types";

const biasTone = {
  BULLISH: {
    text: "text-terminal-green",
    border: "border-green-500/20",
    bg: "bg-green-500/10",
    fill: "bg-terminal-green",
  },
  BEARISH: {
    text: "text-terminal-red",
    border: "border-red-500/20",
    bg: "bg-red-500/10",
    fill: "bg-terminal-red",
  },
  NEUTRAL: {
    text: "text-yellow-200",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/10",
    fill: "bg-yellow-300",
  },
};

export function SentimentPanel({ snapshot, momentumFlash = null }: { snapshot: MarketSnapshot; momentumFlash?: "active" | null }) {
  const tone = biasTone[snapshot.bias];
  const bullPct = Math.min(100, Math.max(0, snapshot.score));
  const bearPct = Math.min(100, Math.max(0, 100 - snapshot.score));
  const neutralPct = snapshot.bias === "NEUTRAL" ? 42 : 12;

  return (
    <section className="rounded border border-terminal-border bg-terminal-panel p-3">
      <div className="mb-4 flex items-start justify-between border-b border-terminal-border pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">Sentiment</h2>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">Score</p>
          <p className="font-medium text-terminal-text tabular-nums">{snapshot.score}/100</p>
        </div>
      </div>

      <div className={`mb-4 inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${tone.border} ${tone.bg} ${tone.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${tone.fill}`} />
        {snapshot.bias}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-terminal-border bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">ATR 14</p>
          <p className="mt-1 text-sm font-medium text-terminal-cyan tabular-nums">{snapshot.atr_14_pct.toFixed(2)}%</p>
        </div>
        <div className="rounded border border-terminal-border bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">24H</p>
          <p className={`mt-1 text-sm font-medium tabular-nums ${snapshot.change_24h_pct >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
            {snapshot.change_24h_pct >= 0 ? "+" : ""}{snapshot.change_24h_pct.toFixed(2)}%
          </p>
        </div>
        <div className={`rounded border border-terminal-border bg-black/20 p-2 ${momentumFlash === "active" ? "micro-pulse-cyan" : ""}`}>
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">Momentum</p>
          <p className={`mt-1 text-sm font-medium truncate ${snapshot.momentum_direction === "BULLISH" ? "text-terminal-green" : snapshot.momentum_direction === "BEARISH" ? "text-terminal-red" : "text-yellow-200"}`}>
            {snapshot.momentum_direction}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="text-terminal-muted">Bull</span>
            <span className="text-terminal-green tabular-nums">{bullPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30">
            <div className="h-1.5 rounded-full bg-terminal-green" style={{ width: `${bullPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="text-terminal-muted">Bear</span>
            <span className="text-terminal-red tabular-nums">{bearPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30">
            <div className="h-1.5 rounded-full bg-terminal-red" style={{ width: `${bearPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="text-terminal-muted">Neutral</span>
            <span className="text-yellow-200 tabular-nums">{neutralPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/30">
            <div className="h-1.5 rounded-full bg-yellow-300" style={{ width: `${neutralPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
