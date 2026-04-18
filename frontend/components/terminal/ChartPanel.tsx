import { MarketSnapshot } from "@/lib/types";
import { NativeChart } from "./NativeChart";
import { PremiumPanelHeader } from "./PremiumPanelHeader";

interface ChartPanelProps {
  snapshot: MarketSnapshot;
  focusedSymbol: string;
  focusedSource: "live" | "backend-switchable" | "reference";
  focusedBackendSymbol?: string;
  priceFlash?: "up" | "down" | null;
  latestTickLabel?: string;
  zoneFlash?: "active" | null;
  momentumFlash?: "active" | null;
  tradingviewSymbol?: string | null;
  providerLabel?: string;
}

const priceTone = {
  up: "text-terminal-green",
  down: "text-terminal-red",
  null: "text-terminal-text",
};

const zoneTone = {
  SUPPORT: "border-green-500/20 bg-green-500/10 text-terminal-green",
  RESISTANCE: "border-red-500/20 bg-red-500/10 text-terminal-red",
  BREAKOUT: "border-cyan-500/20 bg-cyan-500/10 text-terminal-cyan",
  BREAKDOWN: "border-red-500/20 bg-red-500/10 text-terminal-red",
  MID_RANGE: "border-terminal-border bg-black/10 text-terminal-muted",
};

export function ChartPanel({
  snapshot,
  focusedSymbol,
  focusedSource,
  focusedBackendSymbol,
  priceFlash = null,
  latestTickLabel,
  zoneFlash = null,
  momentumFlash = null,
  tradingviewSymbol,
  providerLabel = "Binance spot",
}: ChartPanelProps) {
  // Display canonical form (slash) regardless of what the backend echoed.
  const resolvedChartSymbol = snapshot.resolved_symbol.includes("/")
    ? snapshot.resolved_symbol
    : snapshot.resolved_symbol.replace(/-/g, "/").replace(/USDT$/, "/USDT");
  const isSwitchingBackendFocus = focusedSource === "backend-switchable" && !!focusedBackendSymbol && focusedBackendSymbol !== snapshot.resolved_symbol;
  const symbolLabel = focusedSource === "reference" || isSwitchingBackendFocus ? resolvedChartSymbol : focusedSymbol;
  const focusSubtitle = focusedSource === "reference"
    ? `Preview focus ${focusedSymbol} selected · chart and analytics still tied to ${resolvedChartSymbol}.`
    : isSwitchingBackendFocus
      ? `Switching backend stream to ${focusedSymbol} · chart and analytics stay on ${resolvedChartSymbol} sampai snapshot baru masuk.`
      : snapshot.symbol_mode === "fallback"
        ? `Fallback snapshot for ${snapshot.requested_symbol} · backend resolved ${snapshot.resolved_symbol}.`
        : `Realtime analytics locked to ${snapshot.resolved_symbol} with volatility, structure, and momentum on one rail.`;

  return (
    <section className="premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <PremiumPanelHeader
        eyebrow="Live Market"
        title={`${symbolLabel} · 15m`}
        subtitle={focusSubtitle}
        rightContent={
          <div className="text-left md:text-right">
            <p className="text-sm text-terminal-muted">Last Price</p>
            <p className={`mt-1 text-2xl font-semibold ${priceTone[String(priceFlash) as keyof typeof priceTone]}`}>
              ${snapshot.price.toLocaleString()}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 md:justify-end">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${snapshot.change_24h_pct >= 0 ? "border-green-500/20 bg-green-500/10 text-terminal-green" : "border-red-500/20 bg-red-500/10 text-terminal-red"}`}>
                {snapshot.change_24h_pct >= 0 ? "+" : ""}{snapshot.change_24h_pct.toFixed(2)}%
              </span>
              {latestTickLabel ? (
                <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
                  Tick {latestTickLabel}
                </span>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
          {providerLabel}
        </span>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-terminal-cyan">
          {symbolLabel}
        </span>
        <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
          {focusedSource === "reference" ? "Reference preview" : snapshot.symbol_mode === "fallback" ? "Backend fallback" : "Live symbol"}
        </span>
        <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
          ATR {snapshot.atr_14_pct.toFixed(2)}%
        </span>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${snapshot.momentum_direction === "BULLISH" ? "border-green-500/20 bg-green-500/10 text-terminal-green" : snapshot.momentum_direction === "BEARISH" ? "border-red-500/20 bg-red-500/10 text-terminal-red" : "border-terminal-border bg-black/10 text-terminal-muted"} ${momentumFlash === "active" ? "micro-pulse-cyan" : ""}`}>
          Momentum {snapshot.momentum_direction} · {snapshot.momentum_strength}
        </span>
        <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
          Move {snapshot.momentum_change_pct >= 0 ? "+" : ""}{snapshot.momentum_change_pct.toFixed(2)}%
        </span>
        <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
          Pivot {snapshot.pivot.toLocaleString()}
        </span>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-terminal-green">
          Support {snapshot.support.toLocaleString()}
        </span>
        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-terminal-red">
          Resistance {snapshot.resistance.toLocaleString()}
        </span>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${zoneTone[snapshot.zone_context]} ${zoneFlash === "active" ? "micro-pulse-cyan" : ""}`}>
          {snapshot.zone_context}
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-terminal-border/50 bg-black/20" style={{ height: "400px" }}>
        <NativeChart snapshot={snapshot} />
      </div>
    </section>
  );
}
