import { MarketSnapshot } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getSnapshot(symbol?: string): Promise<MarketSnapshot> {
  const url = new URL("/snapshot", API_BASE);
  if (symbol) {
    url.searchParams.set("symbol", symbol);
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.status}`);
  }

  return response.json() as Promise<MarketSnapshot>;
}
