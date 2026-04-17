import { BACKEND_SWITCHABLE_SYMBOLS, DEFAULT_BACKEND_SYMBOL } from "./watchlist";

export const TERMINAL_SYMBOL_QUERY_KEY = "symbol";
export const TERMINAL_LAST_SYMBOL_STORAGE_KEY = "terminal:last-backend-symbol";

export function normalizeBackendSymbol(value?: string | string[] | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }

  const normalized = raw.toUpperCase().replace(/[^A-Z]/g, "");
  return BACKEND_SWITCHABLE_SYMBOLS.includes(normalized) ? normalized : null;
}

export function getInitialSymbolFromSearchParams(
  searchParams?: Record<string, string | string[] | undefined> | null,
): string {
  const fromQuery = normalizeBackendSymbol(searchParams?.[TERMINAL_SYMBOL_QUERY_KEY]);
  return fromQuery ?? DEFAULT_BACKEND_SYMBOL;
}

export function readPersistedBackendSymbol(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeBackendSymbol(window.localStorage.getItem(TERMINAL_LAST_SYMBOL_STORAGE_KEY));
}

export function persistBackendSymbol(symbol: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeBackendSymbol(symbol);
  if (!normalized) {
    return;
  }

  window.localStorage.setItem(TERMINAL_LAST_SYMBOL_STORAGE_KEY, normalized);
}
