"use client";

import { useEffect, useMemo, useState } from "react";

import {
  formatRecentEventRelativeTime,
  formatSuppressedRecentEventBadgeLabel,
  formatSuppressedRecentEventHistoryDismissalBadgeLabel,
  formatSuppressedRecentEventHistoryLabel,
  getRecentEventPinRemainingLabel,
  getSuppressedRecentEventHistoryDismissKey,
  getSuppressedRecentEventHistoryDismissalCount,
  getSuppressedRecentEventHistoryDismissedKeysForSymbol,
  getSuppressedRecentEventHistorySource,
  isRecentEventPinned,
  isSuppressedRecentEventHistoryDismissed,
  pruneSuppressedRecentEventHistoryDismissalsForSymbol,
  pushSuppressedRecentEventHistoryDismissal,
  prioritizeRecentEventsForDisplay,
  shouldStartRecentEventRailTicker,
  shouldStartRecentEventRailTickerForDismissedKeys,
  type RecentEvent,
  type SuppressedRecentEventHistoryDismissState,
} from "@/lib/recentEventMemory";
import { PremiumPanelHeader } from "./PremiumPanelHeader";

const toneMap = {
  info: {
    chip: "border-cyan-500/20 bg-cyan-500/10 text-terminal-cyan",
    dot: "bg-terminal-cyan",
  },
  bull: {
    chip: "border-green-500/20 bg-green-500/10 text-terminal-green",
    dot: "bg-terminal-green",
  },
  bear: {
    chip: "border-red-500/20 bg-red-500/10 text-terminal-red",
    dot: "bg-terminal-red",
  },
  warn: {
    chip: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
    dot: "bg-yellow-300",
  },
};

export function RecentEventRail({
  events,
  latestTickLabel,
  resolvedSymbol,
  suppressedRecentEventCount = 0,
  suppressedRecentEventLastUpdatedAt,
  suppressedRecentEventHistoryDismissedKey = [],
  onDismissSuppressedRecentEventHistory,
}: {
  events: RecentEvent[];
  latestTickLabel?: string;
  resolvedSymbol: string;
  suppressedRecentEventCount?: number;
  suppressedRecentEventLastUpdatedAt?: number;
  suppressedRecentEventHistoryDismissedKey?: string[];
  onDismissSuppressedRecentEventHistory?: (dismissedKey: string) => void;
}) {
  const [relativeNow, setRelativeNow] = useState(() => Date.now());
  const [dismissedHistoryKeys, setDismissedHistoryKeys] = useState<SuppressedRecentEventHistoryDismissState>({});
  const prioritizedEvents = prioritizeRecentEventsForDisplay(events, { now: relativeNow });
  const suppressedHistoryEntry = useMemo(
    () =>
      suppressedRecentEventCount > 0 && suppressedRecentEventLastUpdatedAt
        ? { count: suppressedRecentEventCount, lastUpdatedAt: suppressedRecentEventLastUpdatedAt }
        : undefined,
    [suppressedRecentEventCount, suppressedRecentEventLastUpdatedAt],
  );
  const suppressedHistorySourceLabel = useMemo(
    () => getSuppressedRecentEventHistorySource(prioritizedEvents),
    [prioritizedEvents],
  );
  const suppressedHistoryDismissKey = useMemo(
    () => getSuppressedRecentEventHistoryDismissKey(suppressedHistoryEntry, suppressedHistorySourceLabel),
    [suppressedHistoryEntry, suppressedHistorySourceLabel],
  );
  const effectiveDismissedHistoryKey = getSuppressedRecentEventHistoryDismissedKeysForSymbol(
    dismissedHistoryKeys,
    resolvedSymbol,
    suppressedRecentEventHistoryDismissedKey,
  );
  const hiddenHistoryCount = getSuppressedRecentEventHistoryDismissalCount(effectiveDismissedHistoryKey);
  const hiddenHistoryBadgeLabel = formatSuppressedRecentEventHistoryDismissalBadgeLabel(effectiveDismissedHistoryKey, relativeNow);
  const hasTimedHiddenHistoryBadge = shouldStartRecentEventRailTickerForDismissedKeys(effectiveDismissedHistoryKey);
  const isSuppressedHistoryDismissed = isSuppressedRecentEventHistoryDismissed(
    suppressedHistoryEntry,
    effectiveDismissedHistoryKey,
    suppressedHistorySourceLabel,
  );

  useEffect(() => {
    setDismissedHistoryKeys((current) =>
      pruneSuppressedRecentEventHistoryDismissalsForSymbol(current, resolvedSymbol, suppressedHistoryEntry),
    );
  }, [resolvedSymbol, suppressedHistoryEntry]);

  useEffect(() => {
    if (!shouldStartRecentEventRailTicker({
      eventsCount: events.length,
      suppressedRecentEventCount,
      hiddenHistoryCount: hasTimedHiddenHistoryBadge ? hiddenHistoryCount : 0,
    })) {
      return;
    }

    setRelativeNow(Date.now());
    const intervalId = window.setInterval(() => {
      setRelativeNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [events.length, hasTimedHiddenHistoryBadge, hiddenHistoryCount, suppressedRecentEventCount]);

  return (
    <section className="premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow">
      <PremiumPanelHeader
        eyebrow="Recent Events"
        title={`Signal History · ${resolvedSymbol}`}
        subtitle="Per-symbol event rail for structure, momentum, and signal changes."
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            {suppressedRecentEventCount > 0 && suppressedRecentEventLastUpdatedAt ? (
              <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
                {formatSuppressedRecentEventBadgeLabel(
                  { count: suppressedRecentEventCount, lastUpdatedAt: suppressedRecentEventLastUpdatedAt },
                  relativeNow,
                )}
              </span>
            ) : null}
            {hiddenHistoryCount > 0 && hiddenHistoryBadgeLabel ? (
              <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
                {hiddenHistoryBadgeLabel}
              </span>
            ) : null}
            {latestTickLabel ? (
              <span className="rounded-full border border-terminal-border bg-black/10 px-3 py-1 text-xs font-medium text-terminal-muted">
                Last tick {latestTickLabel}
              </span>
            ) : null}
          </div>
        }
      />

      <div className="mt-4 space-y-3">
        {suppressedHistoryEntry && !isSuppressedHistoryDismissed ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-terminal-border/70 bg-black/5 px-3 py-2 text-xs text-terminal-muted">
            <span>
              {formatSuppressedRecentEventHistoryLabel(suppressedHistoryEntry, suppressedHistorySourceLabel)}
            </span>
            {suppressedHistoryDismissKey ? (
              <button
                type="button"
                aria-label="Dismiss suppression history row"
                className="rounded-full border border-terminal-border bg-black/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terminal-muted transition hover:border-terminal-muted hover:text-terminal-text"
                onClick={() => {
                  setDismissedHistoryKeys((current) =>
                    pushSuppressedRecentEventHistoryDismissal(current, resolvedSymbol, suppressedHistoryDismissKey),
                  );
                  onDismissSuppressedRecentEventHistory?.(suppressedHistoryDismissKey);
                }}
              >
                Hide
              </button>
            ) : null}
          </div>
        ) : null}
        {events.length === 0 ? (
          <div className="premium-glass rounded-xl border border-terminal-border bg-black/10 px-3 py-3 text-sm text-terminal-muted shadow-glow">
            Belum ada event tersimpan buat {resolvedSymbol}. Nunggu perubahan pertama dari websocket live feed...
          </div>
        ) : (
          prioritizedEvents.map((event) => (
            <div key={event.id} className="premium-glass rounded-xl border border-terminal-border bg-black/10 px-3 py-3 shadow-glow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${toneMap[event.tone].dot}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneMap[event.tone].chip}`}>
                        {event.label}
                      </span>
                      {isRecentEventPinned(event, relativeNow) ? (
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terminal-cyan">
                          {getRecentEventPinRemainingLabel(event, relativeNow)}
                        </span>
                      ) : null}
                      {event.repeatCount && event.repeatCount > 1 ? (
                        <span className="rounded-full border border-terminal-border bg-black/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-terminal-muted">
                          x{event.repeatCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-terminal-text">{event.detail}</p>
                  </div>
                </div>
                <span
                  className="text-[11px] uppercase tracking-[0.14em] text-terminal-muted"
                  title={new Date(event.occurredAt).toLocaleString()}
                >
                  {formatRecentEventRelativeTime(event.occurredAt, relativeNow)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
