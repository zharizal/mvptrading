import { DEFAULT_BACKEND_SYMBOL } from "./watchlist";

export const TERMINAL_SYMBOL_QUERY_KEY = "symbol";
export const TERMINAL_LAST_SYMBOL_STORAGE_KEY = "terminal:last-backend-symbol";

/**
 * Normalize a user-supplied symbol string into the form we send to the backend.
 * Accepts:
 *   - 'BTCUSDT' (legacy Binance form)
 *   - 'BTC/USDT' / 'btc/usdt' (canonical)
 *   - 'BTC-USDT' (URL-safe)
 *
 * Returns uppercase input stripped of whitespace, preserving the separator
 * used (so URL params keep the dash and localStorage keeps whatever the
 * user last interacted with). Returns `null` for empty / clearly malformed
 * input.
 */
export function normalizeBackendSymbol(value?: string | string[] | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Allow A-Z, digits, slash, dash only.
  if (!/^[A-Za-z0-9/\-]{3,20}$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function getInitialSymbolFromSearchParams(
  searchParams?: Record<string, string | string[] | undefined> | null,
): string {
  const fromQuery = normalizeBackendSymbol(searchParams?.[TERMINAL_SYMBOL_QUERY_KEY]);
  return fromQuery ?? DEFAULT_BACKEND_SYMBOL;
}

export function readPersistedBackendSymbol(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeBackendSymbol(
    window.localStorage.getItem(TERMINAL_LAST_SYMBOL_STORAGE_KEY),
  );
}

export function persistBackendSymbol(symbol: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeBackendSymbol(symbol);
  if (!normalized) return;
  window.localStorage.setItem(TERMINAL_LAST_SYMBOL_STORAGE_KEY, normalized);
}
