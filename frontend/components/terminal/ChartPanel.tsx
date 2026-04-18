import { MarketSnapshot } from "@/lib/types";
import { NativeChart } from "./NativeChart";

interface ChartPanelProps {
  snapshot: MarketSnapshot;
  focusedSymbol: string;
  focusedSource: "live" | "backend-switchable" | "reference";
  focusedBackendSymbol?: string;
  priceFlash?: "up" | "down" | null;
  latestTickLabel?: string;
  zoneFlash?: "active" | null;
  momentumFlash?: "active" | null;
  tradingviewSymbol?: string | null;
  providerLabel?: string;
}

export function ChartPanel({
  snapshot,
}: ChartPanelProps) {
  return (
    <NativeChart snapshot={snapshot} />
  );
}
