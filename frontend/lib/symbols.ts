/**
 * Symbol catalog client — fetches the list of tradable instruments
 * exposed by `GET /symbols`.
 *
 * Canonical form uses a slash: `BTC/USDT`, `XAU/USD`, `JPY/IDR`.
 * URL-safe form replaces the slash with a dash: `BTC-USDT`. Backend
 * accepts both; we prefer the dash form inside URL query params.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type AssetClass = "crypto" | "forex" | "commodity";

export interface CatalogSymbol {
  canonical_symbol: string;           // 'BTC/USDT'
  display_name: string;
  asset_class: AssetClass;
  provider: string;                   // 'binance' | 'twelvedata'
  base_ccy: string;
  quote_ccy: string;
  pip_size: number | null;
  tradingview_symbol: string | null;  // 'BINANCE:BTCUSDT' | 'OANDA:XAUUSD'
  url_symbol: string;                 // 'BTC-USDT'
}

export interface CatalogGroup {
  asset_class: AssetClass;
  symbols: CatalogSymbol[];
}

export interface CatalogResponse {
  groups: CatalogGroup[];
  total: number;
}

export async function getSymbolCatalog(): Promise<CatalogResponse> {
  const url = new URL("/symbols", API_BASE);
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch symbol catalog: ${response.status}`);
  }
  return (await response.json()) as CatalogResponse;
}

/** Flatten grouped catalog into a single list, preserving group order. */
export function flattenCatalog(response: CatalogResponse): CatalogSymbol[] {
  return response.groups.flatMap((g) => g.symbols);
}

export function findCatalogEntry(
  catalog: CatalogSymbol[] | null,
  symbol: string,
): CatalogSymbol | undefined {
  if (!catalog) return undefined;
  const canonical = toCanonical(symbol);
  return catalog.find(
    (s) => s.canonical_symbol === canonical || s.url_symbol === canonical,
  );
}

/**
 * Accept legacy `BTCUSDT` / canonical `BTC/USDT` / URL `BTC-USDT` and
 * return canonical slash form. Returns the uppercased input if we can't
 * confidently detect a BASE/QUOTE split (backend will still resolve it).
 */
export function toCanonical(symbol: string): string {
  const upper = symbol.toUpperCase().trim();
  if (upper.includes("/")) return upper;
  if (upper.includes("-")) return upper.replace("-", "/");
  // Legacy no-separator form like 'BTCUSDT' — try to infer.
  const knownQuotes = ["USDT", "USDC", "BUSD", "IDR", "JPY", "USD", "EUR"];
  for (const q of knownQuotes) {
    if (upper.endsWith(q) && upper.length > q.length) {
      return `${upper.slice(0, -q.length)}/${q}`;
    }
  }
  return upper;
}

/** Canonical slash form → URL-safe dash form. */
export function toUrlSymbol(symbol: string): string {
  return toCanonical(symbol).replace("/", "-");
}
