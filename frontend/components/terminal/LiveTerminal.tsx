"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getSnapshot } from "@/lib/api";
import {
  appendGroupedRecentEventToMemory,
  buildRecentEventMemoryState,
  decaySuppressedRecentEventCounts,
  getRecentEventsForSymbol,
  incrementSuppressedRecentEventCount,
  persistRecentEventMemory,
  persistSuppressedRecentEventCounts,
  persistSuppressedRecentEventHistoryDismissals,
  pruneSuppressedRecentEventHistoryDismissals,
  pushSuppressedRecentEventHistoryDismissal,
  readPersistedRecentEventMemory,
  readPersistedSuppressedRecentEventHistoryDismissals,
  readPersistedSuppressedRecentEventCounts,
  resetSuppressedRecentEventCount,
  suppressMinorRecentEventIfNeeded,
  type RecentEvent,
  type RecentEventMemoryState,
  type SuppressedRecentEventCountState,
  type SuppressedRecentEventHistoryDismissState,
} from "@/lib/recentEventMemory";
import { persistBackendSymbol, readPersistedBackendSymbol, TERMINAL_SYMBOL_QUERY_KEY } from "@/lib/symbolPersistence";
import {
  flattenCatalog,
  findCatalogEntry,
  getSymbolCatalog,
  type CatalogSymbol,
} from "@/lib/symbols";
import { DEFAULT_BACKEND_SYMBOL, type WatchlistItem, formatTerminalSymbol } from "@/lib/watchlist";
import { connectMarketSocket } from "@/lib/websocket";
import { MarketSnapshot } from "@/lib/types";
import { useTransientHighlight } from "@/lib/useTransientHighlight";
import { CommandPalette } from "./CommandPalette";
import { TerminalLayout } from "./TerminalLayout";

const PROVIDER_LABEL: Record<string, string> = {
  binance: "Binance spot",
  twelvedata: "TwelveData",
};

interface LiveTerminalProps {
  initialSnapshot: MarketSnapshot;
  initialDataSource?: "backend" | "mock-fallback";
  initialFetchError?: string;
}

function buildEvent(label: string, detail: string, tone: RecentEvent["tone"]): RecentEvent {
  const now = new Date();
  return {
    id: `${now.getTime()}-${label}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    detail,
    tone,
    timeLabel: now.toLocaleTimeString(),
    occurredAt: now.getTime(),
  };
}

function createLiveWatchItem(snapshot: MarketSnapshot): WatchlistItem {
  return {
    symbol: formatTerminalSymbol(snapshot.resolved_symbol),
    backendSymbol: snapshot.resolved_symbol,
    price: snapshot.price,
    changePct: snapshot.change_24h_pct,
    source: "live",
  };
}

export function LiveTerminal({
  initialSnapshot,
  initialDataSource = "backend",
  initialFetchError,
}: LiveTerminalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLiveWatchItem = useMemo(() => createLiveWatchItem(initialSnapshot), [initialSnapshot]);

  const [snapshot, setSnapshot] = useState<MarketSnapshot>(initialSnapshot);
  const [selectedWatchSymbol, setSelectedWatchSymbol] = useState<WatchlistItem>(initialLiveWatchItem);
  const [activeBackendSymbol, setActiveBackendSymbol] = useState<string>(initialSnapshot.resolved_symbol);
  const [catalog, setCatalog] = useState<CatalogSymbol[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"backend" | "mock-fallback">(initialDataSource);
  const [fetchError, setFetchError] = useState<string | undefined>(initialFetchError);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "live" | "reconnecting" | "offline">("connecting");
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);
  const [latestTickLabel, setLatestTickLabel] = useState<string | undefined>(undefined);
  const [recentEventMemory, setRecentEventMemory] = useState<RecentEventMemoryState>(() =>
    buildRecentEventMemoryState(initialSnapshot.resolved_symbol),
  );
  const [suppressedRecentEventCounts, setSuppressedRecentEventCounts] = useState<SuppressedRecentEventCountState>({});
  const [suppressedRecentEventHistoryDismissals, setSuppressedRecentEventHistoryDismissals] =
    useState<SuppressedRecentEventHistoryDismissState>({});
  const { highlight: signalFlash, trigger: triggerSignalFlash } = useTransientHighlight(1200);
  const { highlight: zoneFlash, trigger: triggerZoneFlash } = useTransientHighlight(1100);
  const { highlight: momentumFlash, trigger: triggerMomentumFlash } = useTransientHighlight(1100);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressedCountDecayTimerRef = useRef<number | null>(null);
  const persistenceHydratedRef = useRef(false);
  const eventMemoryHydratedRef = useRef(false);
  const skipNextUrlSyncRef = useRef(false);
  const previousPriceRef = useRef<number>(initialSnapshot.price);
  const previousSnapshotRef = useRef<MarketSnapshot>(initialSnapshot);
  const activeRecentEvents = getRecentEventsForSymbol(recentEventMemory, snapshot.resolved_symbol);
  const activeSuppressedRecentEventEntry = suppressedRecentEventCounts[snapshot.resolved_symbol];
  const activeSuppressedRecentEventCount = activeSuppressedRecentEventEntry?.count ?? 0;
  const activeSuppressedRecentEventHistoryDismissedKeys =
    suppressedRecentEventHistoryDismissals[snapshot.resolved_symbol] ?? [];

  useEffect(() => {
    let cancelled = false;
    getSymbolCatalog()
      .then((response) => {
        if (!cancelled) {
          setCatalog(flattenCatalog(response));
          setCatalogError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : "catalog fetch failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (eventMemoryHydratedRef.current) {
      return;
    }

    const persistedEventMemory = readPersistedRecentEventMemory();
    const persistedSuppressedCounts = readPersistedSuppressedRecentEventCounts();
    const persistedSuppressedHistoryDismissals = readPersistedSuppressedRecentEventHistoryDismissals();
    setRecentEventMemory((current) => ({
      ...current,
      ...persistedEventMemory,
    }));
    setSuppressedRecentEventCounts(persistedSuppressedCounts);
    setSuppressedRecentEventHistoryDismissals(persistedSuppressedHistoryDismissals);
    eventMemoryHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!eventMemoryHydratedRef.current) {
      return;
    }

    persistRecentEventMemory(recentEventMemory);
  }, [recentEventMemory]);

  useEffect(() => {
    if (!eventMemoryHydratedRef.current) {
      return;
    }

    persistSuppressedRecentEventCounts(suppressedRecentEventCounts);
  }, [suppressedRecentEventCounts]);

  useEffect(() => {
    if (!eventMemoryHydratedRef.current) {
      return;
    }

    setSuppressedRecentEventHistoryDismissals((current) =>
      pruneSuppressedRecentEventHistoryDismissals(current, suppressedRecentEventCounts),
    );
  }, [suppressedRecentEventCounts]);

  useEffect(() => {
    if (!eventMemoryHydratedRef.current) {
      return;
    }

    persistSuppressedRecentEventHistoryDismissals(suppressedRecentEventHistoryDismissals);
  }, [suppressedRecentEventHistoryDismissals]);

  useEffect(() => {
    suppressedCountDecayTimerRef.current = window.setInterval(() => {
      setSuppressedRecentEventCounts((current) => decaySuppressedRecentEventCounts(current));
    }, 60_000);

    return () => {
      if (suppressedCountDecayTimerRef.current) {
        clearInterval(suppressedCountDecayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (persistenceHydratedRef.current) {
      return;
    }

    const persistedSymbol = readPersistedBackendSymbol();
    if (persistedSymbol && !searchParams.get(TERMINAL_SYMBOL_QUERY_KEY) && persistedSymbol !== activeBackendSymbol) {
      skipNextUrlSyncRef.current = true;
      setConnectionStatus("connecting");
      setFetchError(undefined);
      setActiveBackendSymbol(persistedSymbol);
      setSelectedWatchSymbol({
        symbol: formatTerminalSymbol(persistedSymbol),
        backendSymbol: persistedSymbol,
        price: snapshot.price,
        changePct: snapshot.change_24h_pct,
        source: persistedSymbol === snapshot.resolved_symbol ? "live" : "backend-switchable",
      });
    }

    persistenceHydratedRef.current = true;
  }, [activeBackendSymbol, searchParams, snapshot.change_24h_pct, snapshot.price, snapshot.resolved_symbol]);

  useEffect(() => {
    if (!persistenceHydratedRef.current) {
      return;
    }

    persistBackendSymbol(activeBackendSymbol);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (activeBackendSymbol === DEFAULT_BACKEND_SYMBOL) {
        url.searchParams.delete(TERMINAL_SYMBOL_QUERY_KEY);
      } else {
        url.searchParams.set(TERMINAL_SYMBOL_QUERY_KEY, activeBackendSymbol);
      }

      const nextUrl = url.toString();
      if (nextUrl !== window.location.href) {
        window.history.replaceState(null, "", nextUrl);
      }
    }
  }, [activeBackendSymbol]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByApp = false;

    const syncLiveSelection = (nextSnapshot: MarketSnapshot) => {
      setSelectedWatchSymbol((current) =>
        current.source === "reference"
          ? current
          : {
              symbol: formatTerminalSymbol(nextSnapshot.resolved_symbol),
              backendSymbol: nextSnapshot.resolved_symbol,
              price: nextSnapshot.price,
              changePct: nextSnapshot.change_24h_pct,
              source: "live",
            },
      );
    };

    const applyIncomingSnapshot = (incomingSnapshot: MarketSnapshot, options?: { resetDiffState?: boolean }) => {
      const resetDiffState = options?.resetDiffState ?? false;
      const previousPrice = previousPriceRef.current;
      const nextPrice = incomingSnapshot.price;
      const previousSnapshot = previousSnapshotRef.current;

      if (!resetDiffState) {
        if (nextPrice > previousPrice) {
          setPriceFlash("up");
        } else if (nextPrice < previousPrice) {
          setPriceFlash("down");
        }

        if (flashTimerRef.current) {
          clearTimeout(flashTimerRef.current);
        }
        flashTimerRef.current = setTimeout(() => setPriceFlash(null), 900);

        if (previousSnapshot.signal.direction !== incomingSnapshot.signal.direction) {
          triggerSignalFlash();
          setSuppressedRecentEventCounts((counts) => resetSuppressedRecentEventCount(counts, incomingSnapshot.resolved_symbol));
          setRecentEventMemory((current) =>
            appendGroupedRecentEventToMemory(
              current,
              incomingSnapshot.resolved_symbol,
              buildEvent(
                "Signal",
                `Direction moved ${previousSnapshot.signal.direction} → ${incomingSnapshot.signal.direction}`,
                incomingSnapshot.signal.direction === "BUY" ? "bull" : incomingSnapshot.signal.direction === "SELL" ? "bear" : "warn",
              ),
            ),
          );
        }
        if (previousSnapshot.zone_context !== incomingSnapshot.zone_context) {
          triggerZoneFlash();
          setSuppressedRecentEventCounts((counts) => resetSuppressedRecentEventCount(counts, incomingSnapshot.resolved_symbol));
          setRecentEventMemory((current) =>
            appendGroupedRecentEventToMemory(
              current,
              incomingSnapshot.resolved_symbol,
              buildEvent("Zone", `Zone changed ${previousSnapshot.zone_context} → ${incomingSnapshot.zone_context}`, "info"),
            ),
          );
        }
        if (
          previousSnapshot.momentum_direction !== incomingSnapshot.momentum_direction ||
          previousSnapshot.momentum_strength !== incomingSnapshot.momentum_strength
        ) {
          triggerMomentumFlash();
          const momentumEvent = buildEvent(
            "Momentum",
            `${incomingSnapshot.momentum_direction} ${incomingSnapshot.momentum_strength.toLowerCase()} · ${incomingSnapshot.momentum_change_pct >= 0 ? "+" : ""}${incomingSnapshot.momentum_change_pct.toFixed(2)}%`,
            incomingSnapshot.momentum_direction === "BULLISH" ? "bull" : incomingSnapshot.momentum_direction === "BEARISH" ? "bear" : "warn",
          );
          setRecentEventMemory((current) => {
            const currentSymbolEvents = current[incomingSnapshot.resolved_symbol] ?? [];
            if (suppressMinorRecentEventIfNeeded(currentSymbolEvents, momentumEvent)) {
              setSuppressedRecentEventCounts((counts) =>
                incrementSuppressedRecentEventCount(counts, incomingSnapshot.resolved_symbol),
              );
              return current;
            }

            return appendGroupedRecentEventToMemory(current, incomingSnapshot.resolved_symbol, momentumEvent);
          });
        }
      } else {
        setPriceFlash(null);
      }

      previousPriceRef.current = nextPrice;
      previousSnapshotRef.current = incomingSnapshot;
      setSnapshot(incomingSnapshot);
      syncLiveSelection(incomingSnapshot);
      setDataSource("backend");
      setFetchError(undefined);
      setConnectionStatus("live");
      setLatestTickLabel(new Date().toLocaleTimeString());
    };

    const connect = () => {
      setConnectionStatus((current) => (current === "live" ? "reconnecting" : "connecting"));

      socket = connectMarketSocket((incomingSnapshot) => {
        applyIncomingSnapshot(incomingSnapshot);
      }, activeBackendSymbol);

      socket.onopen = () => {
        setConnectionStatus("live");
        setDataSource("backend");
      };

      socket.onerror = () => {
        if (closedByApp) {
          return;
        }

        setConnectionStatus("offline");
        setFetchError("WebSocket update gagal, tetap pakai snapshot terakhir.");
      };

      socket.onclose = () => {
        if (closedByApp) {
          return;
        }

        setConnectionStatus("reconnecting");
        setFetchError("WebSocket terputus, mencoba reconnect otomatis...");
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };
    };

    const bootstrap = async () => {
      setLatestTickLabel(undefined);
      setPriceFlash(null);
      setConnectionStatus("connecting");

      try {
        const nextSnapshot = await getSnapshot(activeBackendSymbol);
        if (closedByApp) {
          return;
        }
        previousPriceRef.current = nextSnapshot.price;
        previousSnapshotRef.current = nextSnapshot;
        applyIncomingSnapshot(nextSnapshot, { resetDiffState: true });
      } catch (error) {
        if (closedByApp) {
          return;
        }
        setConnectionStatus("offline");
        setFetchError(error instanceof Error ? error.message : "Failed to fetch symbol snapshot");
      }

      if (!closedByApp) {
        connect();
      }
    };

    void bootstrap();

    return () => {
      closedByApp = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
      if (suppressedCountDecayTimerRef.current) {
        clearInterval(suppressedCountDecayTimerRef.current);
      }
      socket?.close();
    };
  }, [activeBackendSymbol, triggerMomentumFlash, triggerSignalFlash, triggerZoneFlash]);

  const handleSelectWatchSymbol = (item: WatchlistItem) => {
    if (item.source === "reference") {
      setSelectedWatchSymbol(item);
      return;
    }

    setSelectedWatchSymbol(item);

    if (item.backendSymbol && item.backendSymbol !== activeBackendSymbol) {
      setConnectionStatus("connecting");
      setFetchError(undefined);
      setActiveBackendSymbol(item.backendSymbol);
    }
  };

  const activeCatalogEntry = findCatalogEntry(catalog, snapshot.resolved_symbol);
  const tradingviewSymbol = activeCatalogEntry?.tradingview_symbol ?? null;
  const providerLabel = activeCatalogEntry
    ? PROVIDER_LABEL[activeCatalogEntry.provider] ?? activeCatalogEntry.provider
    : "Binance spot";

  return (
    <>
      <CommandPalette catalog={catalog} onSelectWatchSymbol={handleSelectWatchSymbol} />
      <TerminalLayout
      snapshot={snapshot}
      selectedWatchSymbol={selectedWatchSymbol}
      onSelectWatchSymbol={handleSelectWatchSymbol}
      dataSource={dataSource}
      fetchError={fetchError}
      connectionStatus={connectionStatus}
      priceFlash={priceFlash}
      latestTickLabel={latestTickLabel}
      signalFlash={signalFlash}
      zoneFlash={zoneFlash}
      momentumFlash={momentumFlash}
      recentEvents={activeRecentEvents}
      recentEventSymbol={snapshot.resolved_symbol}
      suppressedRecentEventCount={activeSuppressedRecentEventCount}
      suppressedRecentEventLastUpdatedAt={activeSuppressedRecentEventEntry?.lastUpdatedAt}
      suppressedRecentEventHistoryDismissedKey={activeSuppressedRecentEventHistoryDismissedKeys}
      onDismissSuppressedRecentEventHistory={(dismissedKey) =>
        setSuppressedRecentEventHistoryDismissals((current) =>
          pushSuppressedRecentEventHistoryDismissal(current, snapshot.resolved_symbol, dismissedKey),
        )
      }
      catalog={catalog}
      catalogError={catalogError}
      tradingviewSymbol={tradingviewSymbol}
      providerLabel={providerLabel}
    />
  </>
  );
}
