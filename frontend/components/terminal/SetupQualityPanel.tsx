import { MarketSnapshot } from "@/lib/types";

const statusTone = {
  passed: {
    chip: "border-green-500/20 bg-green-500/10 text-terminal-green",
    dot: "bg-terminal-green",
    card: "premium-pass-surface",
  },
  warning: {
    chip: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    dot: "bg-yellow-300",
    card: "premium-warn-surface",
  },
  failed: {
    chip: "border-red-500/20 bg-red-500/10 text-terminal-red",
    dot: "bg-terminal-red",
    card: "premium-fail-surface",
  },
};

type CheckStatus = keyof typeof statusTone;

interface QualityCheck {
  label: string;
  status: CheckStatus;
  detail: string;
}

function getSetupQuality(snapshot: MarketSnapshot) {
  if (snapshot.signal.direction === "BUY" || snapshot.signal.direction === "SELL") {
    return {
      label: "Structure confirmed",
      tone: "border-green-500/20 bg-green-500/10 text-terminal-green",
      description: "Directional setup has aligned structure and executable levels.",
    };
  }

  if (snapshot.score >= 68) {
    return {
      label: "Building conviction",
      tone: "border-cyan-500/20 bg-cyan-500/10 text-terminal-cyan",
      description: "Signals are improving, but execution still needs confirmation.",
    };
  }

  return {
    label: "Low conviction / Wait",
    tone: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    description: "Bias exists, but current setup is not strong enough to force execution.",
  };
}

function getExecutionChecks(snapshot: MarketSnapshot): QualityCheck[] {
  const structureAligned =
    snapshot.zone_context === "SUPPORT" ||
    snapshot.zone_context === "BREAKOUT" ||
    snapshot.zone_context === "RESISTANCE" ||
    snapshot.zone_context === "BREAKDOWN";

  const momentumAligned =
    (snapshot.signal.direction === "BUY" && snapshot.momentum_direction === "BULLISH") ||
    (snapshot.signal.direction === "SELL" && snapshot.momentum_direction === "BEARISH") ||
    (snapshot.signal.direction === "WAIT" && snapshot.momentum_strength === "STRONG");

  const atrHealthy = snapshot.atr_14_pct >= 1.0;
  const riskRewardHealthy = snapshot.signal.risk_reward >= 1.2;

  return [
    {
      label: "Structure",
      status: structureAligned ? "passed" : "warning",
      detail: structureAligned ? `Zone ${snapshot.zone_context}` : "Structure still mid-range",
    },
    {
      label: "Momentum",
      status: momentumAligned ? "passed" : "warning",
      detail: momentumAligned
        ? `${snapshot.momentum_direction} ${snapshot.momentum_strength.toLowerCase()} · ${snapshot.momentum_change_pct >= 0 ? "+" : ""}${snapshot.momentum_change_pct.toFixed(2)}%`
        : "Momentum still not aligned with execution",
    },
    {
      label: "ATR",
      status: atrHealthy ? "passed" : "warning",
      detail: atrHealthy ? `ATR ${snapshot.atr_14_pct.toFixed(2)}%` : `ATR ${snapshot.atr_14_pct.toFixed(2)}% is soft`,
    },
    {
      label: "Execution",
      status: snapshot.signal.direction === "WAIT" ? "warning" : riskRewardHealthy ? "passed" : "failed",
      detail:
        snapshot.signal.direction === "WAIT"
          ? "Wait for cleaner entry"
          : riskRewardHealthy
            ? `R/R ${snapshot.signal.risk_reward.toFixed(2)}`
            : `R/R ${snapshot.signal.risk_reward.toFixed(2)} too compressed`,
    },
  ];
}

export function SetupQualityPanel({ snapshot }: { snapshot: MarketSnapshot }) {
  const quality = getSetupQuality(snapshot);
  const checks = getExecutionChecks(snapshot);

  return (
    <div className="rounded border border-terminal-border bg-black/10 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">Checklist</h3>
        <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${quality.tone}`}>
          {quality.label}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <div key={check.label} className={`rounded border border-terminal-border px-2 py-2 ${statusTone[check.status].card}`}>
            <div className="flex items-center justify-between gap-1.5 border-b border-terminal-border/50 pb-1 mb-1.5">
              <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-terminal-muted" title={check.label}>
                {check.label}
              </span>
              <span className={`shrink-0 inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${statusTone[check.status].chip}`}>
                {check.status}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${statusTone[check.status].dot}`} />
              <p className="text-[11px] text-terminal-text leading-snug">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
