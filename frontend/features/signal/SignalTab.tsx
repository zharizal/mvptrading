import type { MarketSnapshot } from "@/lib/types";
import { SignalPanel } from "@/components/terminal/SignalPanel";

interface SignalTabProps {
  snapshot: MarketSnapshot;
  signalFlash?: "active" | null;
  zoneFlash?: "active" | null;
}

/** Signal tab — live engine direction + reasoning. Pairs with the right-column TradeSetupPanel. */
export function SignalTab({ snapshot, signalFlash, zoneFlash }: SignalTabProps) {
  return <SignalPanel snapshot={snapshot} signalFlash={signalFlash} zoneFlash={zoneFlash} />;
}
