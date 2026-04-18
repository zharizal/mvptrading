import { type RecentEvent } from "@/lib/recentEventMemory";
import { type CatalogSymbol } from "@/lib/symbols";
import { MarketSnapshot } from "@/lib/types";
import { type WatchlistItem } from "@/lib/watchlist";
import { ChartPanel } from "./ChartPanel";
import { ChartTabs } from "./ChartTabs";
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

function precisionFor(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("IDR")) return 2;
  if (s.endsWith("JPY") || s.endsWith("/JPY")) return 3;
  if (
    s.startsWith("EUR/") ||
    s.startsWith("GBP/") ||
    s.startsWith("AUD/") ||
    s.startsWith("USD/")
  )
    return 5;
  if (s.includes("XAU") || s.includes("XAG")) return 2;
  if (s.endsWith("USDT") || s.endsWith("USD")) return 2;
  return 5;
}

function fmt(value: number | undefined | null, digits: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function TerminalLayout({
  snapshot,
  selectedWatchSymbol,
  onSelectWatchSymbol,
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
  const lastCandle = snapshot.candles?.[snapshot.candles.length - 1];
  const prec = precisionFor(snapshot.resolved_symbol);

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-terminal-bg text-terminal-text font-sans">
      {/* Top Navbar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-terminal-border bg-terminal-panel px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-terminal-cyan" />
            <h1 className="text-[11px] font-semibold tracking-widest uppercase">Trading Terminal</h1>
          </div>
          {fetchError ? (
            <span className="rounded bg-yellow-500/10 px-2 py-0.5 text-[9px] text-yellow-200">
              Fallback: {fetchError}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-terminal-muted">
            <span className="flex items-center gap-1.5">
               <span className={`h-1.5 w-1.5 rounded-full ${connectionStatus === "live" ? "bg-terminal-green" : "bg-yellow-500"}`} />
               {connectionStatus}
            </span>
            <span className="border-l border-terminal-border pl-2">REQ: {snapshot.requested_symbol}</span>
            <span className="border-l border-terminal-border pl-2">{latestTickLabel}</span>
          </div>
        </div>
      </header>

      {/* Main Layout 3-Columns Edge-to-Edge */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar: Watchlist */}
        <aside className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-terminal-border bg-terminal-panel">
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
        </aside>

        {/* Center Content: Chart & Tabs */}
        <section className="flex flex-1 flex-col overflow-hidden bg-[#0A0E17]">
          {/* Minimalist Info Strip (Replacing MetricCards) */}
          <div className="flex h-10 shrink-0 items-center gap-4 border-b border-terminal-border px-3 text-[11px] tabular-nums bg-terminal-panel">
             <div className="flex items-baseline gap-2">
                <span className="font-bold text-terminal-text text-sm">{selectedWatchSymbol.symbol}</span>
                <span className={`font-semibold ${snapshot.change_24h_pct >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                  {snapshot.change_24h_pct >= 0 ? "+" : ""}{snapshot.change_24h_pct.toFixed(2)}%
                </span>
             </div>
             <div className="h-4 w-px bg-terminal-border" />
             <div className="flex gap-3 text-terminal-muted">
                <span>O <span className="text-terminal-text">{fmt(lastCandle?.open, prec)}</span></span>
                <span>H <span className="text-terminal-text">{fmt(lastCandle?.high, prec)}</span></span>
                <span>L <span className="text-terminal-text">{fmt(lastCandle?.low, prec)}</span></span>
                <span>C <span className="text-terminal-text">{fmt(lastCandle?.close, prec)}</span></span>
                <span>V <span className="text-terminal-text">{lastCandle?.volume ? lastCandle.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</span></span>
             </div>
             <div className="h-4 w-px bg-terminal-border" />
             <div className="flex gap-3 text-terminal-muted">
                <span>Pivot <span className="text-terminal-cyan">{fmt(snapshot.pivot, prec)}</span></span>
                <span>Sup <span className="text-terminal-green">{fmt(snapshot.support, prec)}</span></span>
                <span>Res <span className="text-terminal-red">{fmt(snapshot.resistance, prec)}</span></span>
             </div>
          </div>

          {/* Main Chart Area */}
          <div className="flex-1 overflow-hidden relative">
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
          </div>

          {/* Bottom Tabs Area */}
          <div className="h-[35vh] min-h-[250px] shrink-0 border-t border-terminal-border overflow-y-auto bg-terminal-panel p-2">
            <ChartTabs snapshot={snapshot} signalFlash={signalFlash} zoneFlash={zoneFlash} />
          </div>
        </section>

        {/* Right Sidebar: Execution & Sentiment */}
        <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-l border-terminal-border bg-terminal-panel">
          <div className="p-2 space-y-2">
            <TradeSetupPanel snapshot={snapshot} />
            <SentimentPanel snapshot={snapshot} momentumFlash={momentumFlash} />
          </div>
          <div className="flex-1 border-t border-terminal-border mt-2 p-2">
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
        </aside>
      </div>
    </main>
  );
}
