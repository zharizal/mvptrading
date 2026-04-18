export type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";
export type SignalDirection = "BUY" | "SELL" | "WAIT";
export type ZoneContext = "SUPPORT" | "RESISTANCE" | "BREAKOUT" | "BREAKDOWN" | "MID_RANGE";
export type MomentumDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type MomentumStrength = "STRONG" | "WEAK";
export type SymbolMode = "live" | "fallback" | "preview";

export interface SignalState {
  direction: SignalDirection;
  entry: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  status: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export interface MarketSnapshot {
  symbol: string;
  requested_symbol: string;
  resolved_symbol: string;
  symbol_mode: SymbolMode;
  supports_symbol_switching: boolean;
  price: number;
  change_24h_pct: number;
  high_24h: number;
  low_24h: number;
  pivot: number;
  atr_14_pct: number;
  support: number;
  resistance: number;
  zone_context: ZoneContext;
  momentum_direction: MomentumDirection;
  momentum_strength: MomentumStrength;
  momentum_change_pct: number;
  bias: Bias;
  score: number;
  signal: SignalState;
  reasoning: string;
  updated_at: string;
  candles?: Candle[];
}
