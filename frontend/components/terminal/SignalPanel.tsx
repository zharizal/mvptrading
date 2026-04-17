import { MarketSnapshot } from "@/lib/types";
import { SetupQualityPanel } from "./SetupQualityPanel";
import { PremiumPanelHeader } from "./PremiumPanelHeader";

const directionStyles = {
  BUY: "border-green-500/20 bg-green-500/10 text-terminal-green",
  SELL: "border-red-500/20 bg-red-500/10 text-terminal-red",
  WAIT: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
};

const zoneStyles = {
  SUPPORT: "border-green-500/20 bg-green-500/10 text-terminal-green",
  RESISTANCE: "border-red-500/20 bg-red-500/10 text-terminal-red",
  BREAKOUT: "border-cyan-500/20 bg-cyan-500/10 text-terminal-cyan",
  BREAKDOWN: "border-red-500/20 bg-red-500/10 text-terminal-red",
  MID_RANGE: "border-terminal-border bg-black/10 text-terminal-muted",
};

export function SignalPanel({ snapshot, signalFlash = null, zoneFlash = null }: { snapshot: MarketSnapshot; signalFlash?: "active" | null; zoneFlash?: "active" | null }) {
  const statusTone = snapshot.signal.status === "LIVE_FEED" ? "text-terminal-cyan" : "text-yellow-200";

  return (
    <section className="premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <PremiumPanelHeader
        eyebrow="Decision Surface"
        title="Signal"
        subtitle="Execution stance, quality, and structure context in one compact block."
        rightContent={
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${directionStyles[snapshot.signal.direction]} ${signalFlash === "active" ? "micro-pulse-cyan" : ""}`}>
              {snapshot.signal.direction}
            </span>
            <span className={`text-xs font-medium uppercase tracking-[0.16em] ${statusTone}`}>{snapshot.signal.status}</span>
          </div>
        }
      />

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-[0.16em] text-terminal-muted">Score</p>
          <p className="mt-2 text-2xl font-semibold text-terminal-text">{snapshot.score}/100</p>
        </div>
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-[0.16em] text-terminal-muted">Bias</p>
          <p className="mt-2 text-lg font-semibold text-terminal-green">{snapshot.bias}</p>
        </div>
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-[0.16em] text-terminal-muted">R/R</p>
          <p className="mt-2 text-lg font-semibold text-terminal-cyan">{snapshot.signal.risk_reward.toFixed(2)}</p>
        </div>
        <div className="premium-glass rounded-xl border border-terminal-border px-3 py-3 shadow-glow">
          <p className="text-xs uppercase tracking-[0.16em] text-terminal-muted">Zone</p>
          <div className="mt-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${zoneStyles[snapshot.zone_context]} ${zoneFlash === "active" ? "micro-pulse-cyan" : ""}`}>
              {snapshot.zone_context}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-terminal-green">
          Support {snapshot.support.toLocaleString()}
        </span>
        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-terminal-red">
          Resistance {snapshot.resistance.toLocaleString()}
        </span>
      </div>

      <div className="mt-4">
        <SetupQualityPanel snapshot={snapshot} />
      </div>

      <p className="mt-4 text-sm leading-6 text-terminal-muted">{snapshot.reasoning}</p>
    </section>
  );
}
