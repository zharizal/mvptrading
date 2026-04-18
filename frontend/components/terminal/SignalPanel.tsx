import { MarketSnapshot } from "@/lib/types";
import { SetupQualityPanel } from "./SetupQualityPanel";

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
    <section className="rounded border border-terminal-border bg-terminal-panel p-3">
      <div className="mb-4 flex items-center justify-between border-b border-terminal-border pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">Signal</h2>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${statusTone}`}>{snapshot.signal.status}</span>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${directionStyles[snapshot.signal.direction]} ${signalFlash === "active" ? "micro-pulse-cyan" : ""}`}>
            {snapshot.signal.direction}
          </span>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="rounded border border-terminal-border bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">Score</p>
          <p className="mt-1 text-base font-medium text-terminal-text tabular-nums">{snapshot.score}/100</p>
        </div>
        <div className="rounded border border-terminal-border bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">Bias</p>
          <p className="mt-1 text-sm font-medium text-terminal-green">{snapshot.bias}</p>
        </div>
        <div className="rounded border border-terminal-border bg-black/20 p-2">
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">R/R</p>
          <p className="mt-1 text-sm font-medium text-terminal-cyan tabular-nums">{snapshot.signal.risk_reward.toFixed(2)}</p>
        </div>
        <div className={`rounded border border-terminal-border bg-black/20 p-2 ${zoneFlash === "active" ? "micro-pulse-cyan" : ""}`}>
          <p className="text-[10px] uppercase tracking-widest text-terminal-muted">Zone</p>
          <div className="mt-1">
            <span className={`truncate text-xs font-medium ${zoneStyles[snapshot.zone_context].replace("border", "border-transparent bg-transparent px-0 py-0")}`}>
              {snapshot.zone_context}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <SetupQualityPanel snapshot={snapshot} />
      </div>

      <div className="rounded border border-terminal-cyan/20 bg-terminal-cyan/5 p-3">
         <p className="text-sm italic leading-relaxed text-terminal-text/90">
            "{snapshot.reasoning}"
         </p>
      </div>
    </section>
  );
}
