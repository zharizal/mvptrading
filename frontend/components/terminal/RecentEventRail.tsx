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
    <section className="rounded border border-terminal-border bg-terminal-panel p-3">
      <div className="mb-3 flex items-center justify-between border-b border-terminal-border pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-terminal-muted">Event Rail</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {suppressedRecentEventCount > 0 && suppressedRecentEventLastUpdatedAt ? (
            <span className="rounded border border-terminal-border bg-black/20 px-2 py-0.5 text-[9px] font-medium text-terminal-muted">
              {formatSuppressedRecentEventBadgeLabel(
                { count: suppressedRecentEventCount, lastUpdatedAt: suppressedRecentEventLastUpdatedAt },
                relativeNow,
              )}
            </span>
          ) : null}
          {hiddenHistoryCount > 0 && hiddenHistoryBadgeLabel ? (
            <span className="rounded border border-terminal-border bg-black/20 px-2 py-0.5 text-[9px] font-medium text-terminal-muted">
              {hiddenHistoryBadgeLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {suppressedHistoryEntry && !isSuppressedHistoryDismissed ? (
          <div className="flex items-start justify-between gap-2 rounded border border-terminal-border/70 bg-black/20 px-2 py-1.5 text-[10px] text-terminal-muted">
            <span>
              {formatSuppressedRecentEventHistoryLabel(suppressedHistoryEntry, suppressedHistorySourceLabel)}
            </span>
            {suppressedHistoryDismissKey ? (
              <button
                type="button"
                aria-label="Dismiss suppression history row"
                className="rounded border border-terminal-border bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-terminal-muted transition hover:border-terminal-muted hover:text-terminal-text"
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
          <div className="rounded border border-terminal-border bg-black/20 px-2 py-3 text-xs text-terminal-muted text-center">
            Menunggu perubahan feed live...
          </div>
        ) : (
          prioritizedEvents.map((event) => (
            <div key={event.id} className="rounded border border-terminal-border bg-black/20 p-2 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneMap[event.tone].dot}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${toneMap[event.tone].chip}`}>
                        {event.label}
                      </span>
                      {isRecentEventPinned(event, relativeNow) ? (
                        <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-terminal-cyan">
                          {getRecentEventPinRemainingLabel(event, relativeNow)}
                        </span>
                      ) : null}
                      {event.repeatCount && event.repeatCount > 1 ? (
                        <span className="rounded border border-terminal-border bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-terminal-muted">
                          x{event.repeatCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-terminal-text leading-snug">{event.detail}</p>
                  </div>
                </div>
                <span
                  className="text-[9px] uppercase tracking-widest text-terminal-muted shrink-0"
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
