/** API Client for Analytics Reports. */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Period = "7d" | "30d" | "90d" | "all";

export interface SymbolPerformance {
  symbol: string;
  trade_count: number;
  win_count: number;
  win_rate: number;
  net_pnl: number;
  net_r: number | null;
}

export interface PerformanceReport {
  period: Period;
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_count: number;
  loss_count: number;
  breakeven_count: number;
  win_rate: number;
  gross_profit: number;
  gross_loss: number;
  net_pnl: number;
  avg_pnl: number;
  profit_factor: number | null;
  best_r: number | null;
  worst_r: number | null;
  avg_r: number | null;
  expectancy_r: number | null;
  max_drawdown: number;
  per_symbol: SymbolPerformance[];
}

export interface SymbolAccuracy {
  symbol: string;
  total: number;
  hit_tp: number;
  hit_sl: number;
  expired: number;
  pending: number;
  hit_rate: number | null;
  avg_time_to_resolve_s: number | null;
}

export interface AccuracyReport {
  period: Period;
  total_signals: number;
  hit_tp: number;
  hit_sl: number;
  expired: number;
  pending: number;
  hit_rate: number | null;
  buy_hit_rate: number | null;
  sell_hit_rate: number | null;
  avg_time_to_resolve_s: number | null;
  per_symbol: SymbolAccuracy[];
}

export interface MarketStatRow {
  symbol: string;
  asset_class: string;
  price: number;
  change_24h_pct: number;
  atr_14_pct: number;
  bias: string;
  score: number;
  zone_context: string;
}

export interface MarketStatsReport {
  symbols: MarketStatRow[];
  top_gainers: MarketStatRow[];
  top_losers: MarketStatRow[];
  most_volatile: MarketStatRow[];
  bias_distribution: Record<string, number>;
}

export interface SessionBucket {
  session: "asia" | "london" | "ny" | "off";
  trade_count: number;
  win_count: number;
  win_rate: number;
  net_pnl: number;
  avg_r: number | null;
}

export interface HourBucket {
  hour: number;
  trade_count: number;
  net_pnl: number;
  win_rate: number;
}

export interface SessionsReport {
  period: Period;
  sessions: SessionBucket[];
  hours: HourBucket[];
}

async function fetchReport<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getPerformance(period: Period): Promise<PerformanceReport> {
  return fetchReport("/analytics/performance", { period });
}

export function getAccuracy(period: Period, symbol?: string): Promise<AccuracyReport> {
  return fetchReport("/analytics/accuracy", { period, symbol: symbol ?? "" });
}

export function getMarketStats(): Promise<MarketStatsReport> {
  return fetchReport("/analytics/market-stats");
}

export function getSessions(period: Period): Promise<SessionsReport> {
  return fetchReport("/analytics/sessions", { period });
}
