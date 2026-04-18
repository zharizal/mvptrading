import type { AssetClass, CatalogSymbol } from "./symbols";
import { toCanonical, toUrlSymbol } from "./symbols";

export const DEFAULT_BACKEND_SYMBOL = "BTCUSDT";

export interface WatchlistItem {
  symbol: string;                       // display (e.g. 'BTC/USDT')
  price: number;
  changePct: number;
  source: "live" | "backend-switchable" | "reference";
  backendSymbol?: string;               // what we send to backend (canonical or URL form)
  assetClass?: AssetClass;
  tradingviewSymbol?: string | null;
  displayName?: string;
}

/**
 * Format a backend symbol for display.
 * - 'BTCUSDT' -> 'BTC/USDT'
 * - 'BTC/USDT' -> 'BTC/USDT'
 * - 'BTC-USDT' -> 'BTC/USDT'
 */
export function formatTerminalSymbol(symbol: string): string {
  return toCanonical(symbol);
}

/** Convert catalog entry to a watchlist item seeded with placeholder price/change. */
export function toWatchlistItem(
  entry: CatalogSymbol,
  overrides?: Partial<Pick<WatchlistItem, "price" | "changePct" | "source">>,
): WatchlistItem {
  return {
    symbol: entry.canonical_symbol,
    backendSymbol: entry.url_symbol,
    price: overrides?.price ?? 0,
    changePct: overrides?.changePct ?? 0,
    source: overrides?.source ?? "backend-switchable",
    assetClass: entry.asset_class,
    tradingviewSymbol: entry.tradingview_symbol,
    displayName: entry.display_name,
  };
}

/**
 * Build the full watchlist from a fetched catalog.
 *
 * The item whose `backendSymbol` matches `activeBackendSymbol` is replaced with
 * the live entry (showing current price/change). Everything else is a
 * backend-switchable placeholder.
 *
 * If the catalog hasn't loaded yet, returns a single live item so the panel
 * is never empty during bootstrap.
 */
export function buildWatchlist(
  catalog: CatalogSymbol[] | null,
  activeBackendSymbol: string,
  activePrice: number,
  activeChangePct: number,
): WatchlistItem[] {
  const activeCanonical = toCanonical(activeBackendSymbol);

  if (!catalog || catalog.length === 0) {
    return [
      {
        symbol: activeCanonical,
        backendSymbol: activeBackendSymbol,
        price: activePrice,
        changePct: activeChangePct,
        source: "live",
      },
    ];
  }

  return catalog.map((entry) => {
    const isLive =
      entry.canonical_symbol === activeCanonical ||
      entry.url_symbol === activeBackendSymbol ||
      entry.canonical_symbol.replace("/", "") === activeBackendSymbol.toUpperCase();

    if (isLive) {
      return toWatchlistItem(entry, {
        price: activePrice,
        changePct: activeChangePct,
        source: "live",
      });
    }
    return toWatchlistItem(entry);
  });
}

/** Group watchlist items by asset class preserving order: crypto → commodity → forex. */
export function groupByAssetClass(
  items: WatchlistItem[],
): { assetClass: AssetClass; items: WatchlistItem[] }[] {
  const buckets = new Map<AssetClass, WatchlistItem[]>();
  for (const item of items) {
    if (!item.assetClass) continue;
    if (!buckets.has(item.assetClass)) buckets.set(item.assetClass, []);
    buckets.get(item.assetClass)!.push(item);
  }
  const order: AssetClass[] = ["crypto", "commodity", "forex"];
  return order
    .filter((ac) => buckets.has(ac))
    .map((ac) => ({ assetClass: ac, items: buckets.get(ac)! }));
}

/** Re-export so callers keep one import. */
export { toUrlSymbol, toCanonical };
