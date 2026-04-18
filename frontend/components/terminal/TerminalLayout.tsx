import { type RecentEvent } from "@/lib/recentEventMemory";
import { type CatalogSymbol } from "@/lib/symbols";
import { MarketSnapshot } from "@/lib/types";
import { type WatchlistItem } from "@/lib/watchlist";
import { ChartPanel } from "./ChartPanel";
import { ChartTabs } from "./ChartTabs";
import { MetricCard } from "./MetricCard";
import { RecentEventRail } from "./RecentEventRail";
import { SentimentPanel } from "./SentimentPanel";
import { TradeSetupPanel } from "./TradeSetupPanel";
import { WatchlistPanel } from "./WatchlistPanel";

interface TerminalLayoutProps {
  snapshot: MarketSnapshot;
  selectedWatchSymbol: WatchlistItem;
  onSelectWatchSymbol: (item: WatchlistItem) => void;
  dataSource?: "backend" | "mock-fallback";
  fetchError?: string;
  connectionStatus?: "connecting" | "live" | "reconnecting" | "offline";
  priceFlash?: "up" | "down" | null;
  latestTickLabel?: string;
  signalFlash?: "active" | null;
  zoneFlash?: "active" | null;
  momentumFlash?: "active" | null;
  recentEvents?: RecentEvent[];
  recentEventSymbol?: string;
  suppressedRecentEventCount?: number;
  suppressedRecentEventLastUpdatedAt?: number;
  suppressedRecentEventHistoryDismissedKey?: string[];
  onDismissSuppressedRecentEventHistory?: (dismissedKey: string) => void;
  catalog?: CatalogSymbol[] | null;
  catalogError?: string | null;
  tradingviewSymbol?: string | null;
  providerLabel?: string;
}

const connectionTone = {
  connecting: "text-yellow-200 border-yellow-500/20 bg-yellow-500/10",
  live: "text-terminal-green border-green-500/20 bg-green-500/10",
  reconnecting: "text-yellow-200 border-yellow-500/20 bg-yellow-500/10",
  offline: "text-terminal-red border-red-500/20 bg-red-500/10",
};

const connectionLabel = {
  connecting: "Socket connecting",
  live: "Realtime live",
  reconnecting: "Reconnecting",
  offline: "Socket offline",
};

export function TerminalLayout({
  snapshot,
  selectedWatchSymbol,
  onSelectWatchSymbol,
  dataSource = "backend",
  fetchError,
  connectionStatus = "connecting",
  priceFlash = null,
  latestTickLabel,
  signalFlash = null,
  zoneFlash = null,
  momentumFlash = null,
  recentEvents = [],
  recentEventSymbol,
  suppressedRecentEventCount = 0,
  suppressedRecentEventLastUpdatedAt,
  suppressedRecentEventHistoryDismissedKey,
  onDismissSuppressedRecentEventHistory,
  catalog = null,
  catalogError,
  tradingviewSymbol,
  providerLabel,
}: TerminalLayoutProps) {
  const statusTone = dataSource === "backend" ? "text-terminal-green" : "text-yellow-300";
  const statusLabel = dataSource === "backend" ? "Backend connected" : "Mock fallback active";
  const focusModeLabel = selectedWatchSymbol.source === "reference"
    ? "preview"
    : selectedWatchSymbol.source === "backend-switchable" && selectedWatchSymbol.backendSymbol !== snapshot.resolved_symbol
      ? "switching"
      : snapshot.symbol_mode;

  return (
    <main className="min-h-screen bg-terminal-bg p-4 text-terminal-text">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex flex-col gap-2 rounded-xl border border-terminal-border bg-terminal-panel px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-terminal-cyan" />
            <h1 className="text-sm font-semibold tracking-wide">Terminal MVP</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${connectionTone[connectionStatus]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connectionStatus === "live" ? "bg-terminal-green" : "bg-current"}`} />
              {connectionLabel[connectionStatus]}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium text-terminal-muted border-l border-terminal-border">
              REQ: {snapshot.requested_symbol}
            </span>
            {latestTickLabel ? (
              <span className="px-2 py-0.5 text-[10px] font-medium text-terminal-muted border-l border-terminal-border">
                {latestTickLabel}
              </span>
            ) : null}
          </div>
        </header>

        {fetchError ? (
          <div className="mb-4 rounded border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            Fallback Mode: {fetchError}
          </div>
        ) : null}

        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Price"
            value={`$${snapshot.price.toLocaleString()}`}
            accent={snapshot.change_24h_pct >= 0 ? "green" : "red"}
            changeHint={`${snapshot.change_24h_pct >= 0 ? "+" : ""}${snapshot.change_24h_pct.toFixed(2)}%`}
            flash={priceFlash}
          />
          <MetricCard label="24H High" value={`$${snapshot.high_24h.toLocaleString()}`} />
          <MetricCard label="24H Low" value={`$${snapshot.low_24h.toLocaleString()}`} />
          <MetricCard label="Pivot" value={`$${snapshot.pivot.toLocaleString()}`} accent="cyan" changeHint={`ATR ${snapshot.atr_14_pct.toFixed(2)}%`} />
          <MetricCard label="Support" value={`$${snapshot.support.toLocaleString()}`} accent="green" changeHint={snapshot.zone_context === "SUPPORT" ? "Active" : undefined} />
          <MetricCard label="Resistance" value={`$${snapshot.resistance.toLocaleString()}`} accent="red" changeHint={snapshot.zone_context === "RESISTANCE" ? "Active" : undefined} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <WatchlistPanel
              activeSymbol={snapshot.resolved_symbol}
              activePrice={snapshot.price}
              activeChangePct={snapshot.change_24h_pct}
              selectedSymbol={selectedWatchSymbol.symbol}
              onSelectSymbol={onSelectWatchSymbol}
              priceFlash={priceFlash}
              catalog={catalog}
              catalogError={catalogError}
            />
            <SentimentPanel snapshot={snapshot} momentumFlash={momentumFlash} />
          </div>

          <div className="space-y-6">
            <ChartPanel
              snapshot={snapshot}
              focusedSymbol={selectedWatchSymbol.symbol}
              focusedSource={selectedWatchSymbol.source}
              focusedBackendSymbol={selectedWatchSymbol.backendSymbol}
              priceFlash={priceFlash}
              latestTickLabel={latestTickLabel}
              zoneFlash={zoneFlash}
              momentumFlash={momentumFlash}
              tradingviewSymbol={tradingviewSymbol}
              providerLabel={providerLabel}
            />
            <ChartTabs snapshot={snapshot} signalFlash={signalFlash} zoneFlash={zoneFlash} />
          </div>

          <div className="space-y-6">
            <TradeSetupPanel snapshot={snapshot} />
            <RecentEventRail
              events={recentEvents}
              latestTickLabel={latestTickLabel}
              resolvedSymbol={recentEventSymbol ?? snapshot.resolved_symbol}
              suppressedRecentEventCount={suppressedRecentEventCount}
              suppressedRecentEventLastUpdatedAt={suppressedRecentEventLastUpdatedAt}
              suppressedRecentEventHistoryDismissedKey={suppressedRecentEventHistoryDismissedKey}
              onDismissSuppressedRecentEventHistory={onDismissSuppressedRecentEventHistory}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
