/** Journal API client — thin wrappers over REST endpoints. */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "open" | "closed";
export type TradeEmotion = "confident" | "fomo" | "revenge" | "fear" | "neutral";

export interface Trade {
  id: number;
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number | null;
  size: number;
  stop_loss: number | null;
  take_profit: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl: number | null;
  r_multiple: number | null;
  notes: string | null;
  tags: string[] | null;
  setup_quality: number | null;
  emotion: string | null;
  status: TradeStatus;
  created_at: string;
  updated_at: string;
}

export interface TradeListResponse {
  items: Trade[];
  total: number;
}

export interface TradeCreatePayload {
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  size: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  entry_time?: string;
  notes?: string | null;
  tags?: string[] | null;
  setup_quality?: number | null;
  emotion?: TradeEmotion | null;
}

export interface TradeClosePayload {
  exit_price: number;
  exit_time?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listTrades(params?: {
  status?: TradeStatus;
  symbol?: string;
  limit?: number;
}): Promise<TradeListResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.symbol) qs.set("symbol", params.symbol);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<TradeListResponse>(`/journal/trades${suffix}`);
}

export function createTrade(payload: TradeCreatePayload): Promise<Trade> {
  return request<Trade>("/journal/trades", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function closeTrade(id: number, payload: TradeClosePayload): Promise<Trade> {
  return request<Trade>(`/journal/trades/${id}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteTrade(id: number): Promise<void> {
  return request<void>(`/journal/trades/${id}`, { method: "DELETE" });
}
