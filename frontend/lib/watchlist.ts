export const DEFAULT_BACKEND_SYMBOL = "BTCUSDT";

export interface WatchlistItem {
  symbol: string;
  price: number;
  changePct: number;
  source: "live" | "backend-switchable" | "reference";
  backendSymbol?: string;
}

const backendSwitchableItems: WatchlistItem[] = [
  { symbol: "ETH/USDT", backendSymbol: "ETHUSDT", price: 3520.5, changePct: 0.91, source: "backend-switchable" },
  { symbol: "SOL/USDT", backendSymbol: "SOLUSDT", price: 182.44, changePct: 1.28, source: "backend-switchable" },
];

export const BACKEND_SWITCHABLE_SYMBOLS = [
  DEFAULT_BACKEND_SYMBOL,
  ...backendSwitchableItems.map((item) => item.backendSymbol ?? DEFAULT_BACKEND_SYMBOL),
];

const referenceItems: WatchlistItem[] = [
  { symbol: "XAU/USD", price: 3340.4, changePct: -0.42, source: "reference" },
  { symbol: "NASDAQ", price: 26198.6, changePct: 0.31, source: "reference" },
  { symbol: "EUR/USD", price: 1.18161, changePct: 0.12, source: "reference" },
  { symbol: "USD/JPY", price: 158.666, changePct: -0.09, source: "reference" },
  { symbol: "AUD/USD", price: 0.71872, changePct: 0.06, source: "reference" },
];

export function formatTerminalSymbol(symbol: string) {
  return symbol.replace("USDT", "/USDT");
}

export function getWatchlistItems(activeSymbol: string, activePrice: number, activeChangePct: number): WatchlistItem[] {
  const liveBackendSymbol = activeSymbol;
  const liveItem: WatchlistItem = {
    symbol: formatTerminalSymbol(activeSymbol),
    backendSymbol: liveBackendSymbol,
    price: activePrice,
    changePct: activeChangePct,
    source: "live",
  };

  const switchableItems = backendSwitchableItems.filter((item) => item.backendSymbol !== liveBackendSymbol);

  return [liveItem, ...switchableItems, ...referenceItems];
}
