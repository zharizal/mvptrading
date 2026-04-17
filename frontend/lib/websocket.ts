import { MarketSnapshot } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8000/ws/market";

export function connectMarketSocket(onMessage: (snapshot: MarketSnapshot) => void, symbol?: string) {
  const url = new URL(WS_URL);
  if (symbol) {
    url.searchParams.set("symbol", symbol);
  }

  const socket = new WebSocket(url.toString());

  socket.onmessage = (event) => {
    onMessage(JSON.parse(event.data) as MarketSnapshot);
  };

  return socket;
}
