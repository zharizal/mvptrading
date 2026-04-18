"use client";

import { useMemo, useState } from "react";

import type { AssetClass } from "@/lib/symbols";
import {
  buildWatchlist,
  formatTerminalSymbol,
  groupByAssetClass,
  type WatchlistItem,
} from "@/lib/watchlist";
import type { CatalogSymbol } from "@/lib/symbols";

interface WatchlistPanelProps {
  activeSymbol: string;
  activePrice: number;
  activeChangePct: number;
  selectedSymbol: string;
  onSelectSymbol: (item: WatchlistItem) => void;
  priceFlash?: "up" | "down" | null;
  catalog: CatalogSymbol[] | null;
  catalogError?: string | null;
}

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  crypto: "Crypto",
  commodity: "Commodity",
  forex: "Forex",
};

const ASSET_CLASS_ICONS: Record<AssetClass, string> = {
  crypto: "₿",
  commodity: "◆",
  forex: "¥",
};

function formatPrice(symbol: string, price: number) {
  if (symbol.includes("/IDR")) return price.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 10) return price.toFixed(2);
  if (price >= 1) return price.toFixed(3);
  return price.toFixed(5);
}

export function WatchlistPanel({
  activeSymbol,
  activePrice,
  activeChangePct,
  selectedSymbol,
  onSelectSymbol,
  priceFlash = null,
  catalog,
  catalogError,
}: WatchlistPanelProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<AssetClass, boolean>>({
    crypto: false,
    commodity: false,
    forex: false,
  });

  const items = useMemo(
    () => buildWatchlist(catalog, activeSymbol, activePrice, activeChangePct),
    [catalog, activeSymbol, activePrice, activeChangePct],
  );

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        (item.displayName?.toLowerCase().includes(q) ?? false) ||
        (item.backendSymbol?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const grouped = useMemo(() => groupByAssetClass(filtered), [filtered]);
  const liveSymbolCanonical = formatTerminalSymbol(activeSymbol);

  const toggle = (ac: AssetClass) => setCollapsed((c) => ({ ...c, [ac]: !c[ac] }));

  return (
    <section className="rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-terminal-muted">Watchlist</h2>
          <p className="mt-1 text-xs text-terminal-muted">
            {catalog ? `${catalog.length} symbol · multi-asset` : "Loading catalog…"}
          </p>
        </div>
        <span className="rounded-lg bg-terminal-green px-2 py-1 text-xs font-semibold text-black">
          {selectedSymbol}
        </span>
      </div>

      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol…"
          className="w-full rounded-lg border border-terminal-border bg-black/20 px-3 py-2 text-sm text-terminal-text placeholder:text-terminal-muted focus:border-terminal-cyan focus:outline-none focus:ring-1 focus:ring-terminal-cyan/40"
        />
      </div>

      {catalogError ? (
        <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-terminal-red">
          Catalog error: {catalogError}
        </p>
      ) : null}

      {grouped.length === 0 && !catalogError ? (
        <div className="space-y-3 animate-pulse opacity-50 px-2 py-4">
          <div className="h-6 w-full rounded bg-terminal-border" />
          <div className="h-10 w-full rounded bg-terminal-border" />
          <div className="h-10 w-full rounded bg-terminal-border" />
        </div>
      ) : null}

      <div className="space-y-3">
        {grouped.map(({ assetClass, items: groupItems }) => {
          const isCollapsed = collapsed[assetClass];
          return (
            <div key={assetClass}>
              <button
                type="button"
                onClick={() => toggle(assetClass)}
                className="mb-1 flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-terminal-muted hover:text-terminal-text"
              >
                <span className="flex items-center gap-2">
                  <span className="text-terminal-cyan">{ASSET_CLASS_ICONS[assetClass]}</span>
                  {ASSET_CLASS_LABELS[assetClass]}
                  <span className="text-[10px] text-terminal-muted/60">({groupItems.length})</span>
                </span>
                <span className="text-terminal-muted">{isCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-1.5">
                  {groupItems.map((item) => {
                    const { symbol, price, changePct, source, displayName } = item;
                    const isLive = symbol === liveSymbolCanonical;
                    const isSelected = symbol === selectedSymbol;
                    const changeTone = changePct >= 0 ? "text-terminal-green" : "text-terminal-red";
                    const flashClass =
                      isLive && priceFlash === "up"
                        ? "metric-flash-up"
                        : isLive && priceFlash === "down"
                          ? "metric-flash-down"
                          : "";
                    const hasPriceData = isLive || price > 0;
                    return (
                      <button
                        type="button"
                        key={symbol}
                        onClick={() => onSelectSymbol(item)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${flashClass} ${
                          isSelected
                            ? "border-terminal-cyan bg-cyan-500/10 shadow-glow"
                            : isLive
                              ? "border-terminal-green bg-green-500/10"
                              : "border-terminal-border bg-black/10 hover:border-terminal-cyan/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={
                              isSelected
                                ? "font-semibold text-terminal-text tabular-nums"
                                : "text-terminal-text tabular-nums"
                            }
                          >
                            {symbol}
                          </span>
                          <span className={`tabular-nums ${isLive ? "text-terminal-green" : "text-terminal-muted"}`}>
                            {hasPriceData ? formatPrice(symbol, price) : "—"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="truncate text-terminal-muted">
                            {displayName ?? (source === "live" ? "Focused stream" : "Click to switch")}
                          </span>
                          <span className={`tabular-nums ${hasPriceData ? changeTone : "text-terminal-muted"}`}>
                            {hasPriceData
                              ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
                              : "switch"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
