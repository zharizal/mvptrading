import { formatTerminalSymbol, getWatchlistItems, type WatchlistItem } from "@/lib/watchlist";

interface WatchlistPanelProps {
  activeSymbol: string;
  activePrice: number;
  activeChangePct: number;
  selectedSymbol: string;
  onSelectSymbol: (item: WatchlistItem) => void;
  priceFlash?: "up" | "down" | null;
}

function formatPrice(symbol: string, price: number) {
  if (symbol.includes("/") && price < 10) {
    return price.toFixed(5);
  }
  if (price < 1000) {
    return price.toFixed(3);
  }
  return price.toLocaleString();
}

export function WatchlistPanel({ activeSymbol, activePrice, activeChangePct, selectedSymbol, onSelectSymbol, priceFlash = null }: WatchlistPanelProps) {
  const items = getWatchlistItems(activeSymbol, activePrice, activeChangePct);
  const liveSymbol = formatTerminalSymbol(activeSymbol);

  return (
    <section className="rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-terminal-muted">Watchlist</h2>
          <p className="mt-1 text-xs text-terminal-muted">Live market focus + static comparables</p>
        </div>
        <button className="rounded-lg bg-terminal-green px-3 py-1 text-xs font-semibold text-black">Focused {selectedSymbol}</button>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const { symbol, price, changePct, source } = item;
          const isLive = symbol === liveSymbol;
          const isSelected = symbol === selectedSymbol;
          const changeTone = changePct >= 0 ? "text-terminal-green" : "text-terminal-red";
          const flashClass = isLive && priceFlash === "up" ? "metric-flash-up" : isLive && priceFlash === "down" ? "metric-flash-down" : "";
          const sourceLabel = isLive ? "Focused stream" : source === "backend-switchable" ? "Backend switch" : "Reference";

          return (
            <button
              type="button"
              key={symbol}
              onClick={() => onSelectSymbol(item)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${flashClass} ${
                isSelected ? "border-terminal-cyan bg-cyan-500/10 shadow-glow" : isLive ? "border-terminal-green bg-green-500/10" : "border-terminal-border bg-black/10"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={isSelected ? "font-semibold text-terminal-text" : "text-terminal-text"}>{symbol}</span>
                <span className={isLive ? "text-terminal-green" : "text-terminal-text"}>{formatPrice(symbol, price)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-terminal-muted">{sourceLabel}</span>
                <span className={changeTone}>{changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
