import { MarketSnapshot } from "@/lib/types";
import { PremiumPanelHeader } from "./PremiumPanelHeader";

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
    <section className="premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <PremiumPanelHeader
        eyebrow="Control Room"
        title="AI Sentiment"
        subtitle="Bias, volatility, and momentum stacked into one cleaner premium card."
        rightContent={
          <div className="rounded-xl border border-terminal-border bg-black/10 px-3 py-2 text-right shadow-glow">
            <p className="text-[11px] uppercase tracking-[0.16em] text-terminal-muted">Confidence</p>
            <p className="mt-1 text-lg font-semibold text-terminal-text">{snapshot.score}/100</p>
          </div>
        }
      />

      <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone.border} ${tone.bg} ${tone.text}`}>
        <span className={`h-2 w-2 rounded-full ${tone.fill}`} />
        {snapshot.bias}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-[11px] uppercase tracking-[0.16em] text-terminal-muted">Volatility</p>
          <p className="mt-2 text-lg font-semibold text-terminal-cyan">ATR {snapshot.atr_14_pct.toFixed(2)}%</p>
        </div>
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-[11px] uppercase tracking-[0.16em] text-terminal-muted">24H Change</p>
          <p className={`mt-2 text-lg font-semibold ${snapshot.change_24h_pct >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
            {snapshot.change_24h_pct >= 0 ? "+" : ""}{snapshot.change_24h_pct.toFixed(2)}%
          </p>
        </div>
        <div className={`premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow ${momentumFlash === "active" ? "micro-pulse-cyan" : ""}`}>
          <p className={`mt-2 text-lg font-semibold ${snapshot.momentum_direction === "BULLISH" ? "text-terminal-green" : snapshot.momentum_direction === "BEARISH" ? "text-terminal-red" : "text-yellow-200"}`}>
            {snapshot.momentum_direction} · {snapshot.momentum_strength}
          </p>
          <p className="mt-1 text-xs text-terminal-muted">
            {snapshot.momentum_change_pct >= 0 ? "+" : ""}{snapshot.momentum_change_pct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-terminal-muted">Bull</span>
            <span className="text-terminal-green">{bullPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/20">
            <div className="h-2 rounded-full bg-terminal-green" style={{ width: `${bullPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-terminal-muted">Bear</span>
            <span className="text-terminal-red">{bearPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/20">
            <div className="h-2 rounded-full bg-terminal-red" style={{ width: `${bearPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-terminal-muted">Neutral</span>
            <span className="text-yellow-200">{neutralPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/20">
            <div className="h-2 rounded-full bg-yellow-300" style={{ width: `${neutralPct}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
