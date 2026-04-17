export interface RecentEvent {
  id: string;
  label: string;
  detail: string;
  tone: "info" | "bull" | "bear" | "warn";
  timeLabel: string;
  occurredAt: number;
  repeatCount?: number;
}

export type RecentEventMemoryState = Record<string, RecentEvent[]>;
export interface SuppressedRecentEventCountEntry {
  count: number;
  lastUpdatedAt: number;
}
export type SuppressedRecentEventCountState = Record<string, SuppressedRecentEventCountEntry>;
export type SuppressedRecentEventHistoryDismissState = Record<string, string[]>;

export const MAX_RECENT_EVENTS_PER_SYMBOL = 8;
export const MAX_SUPPRESSED_HISTORY_DISMISSALS_PER_SYMBOL = 4;
export const RECENT_EVENT_MEMORY_STORAGE_KEY = "terminal:recent-event-memory";
export const SUPPRESSED_RECENT_EVENT_COUNT_STORAGE_KEY = "terminal:suppressed-recent-event-counts";
export const SUPPRESSED_RECENT_EVENT_HISTORY_DISMISS_STORAGE_KEY = "terminal:suppressed-recent-event-history-dismissals";
const GROUPABLE_EVENT_WINDOW_MS = 90_000;
const VALID_EVENT_TONES = new Set<RecentEvent["tone"]>(["info", "bull", "bear", "warn"]);
const EVENT_LABEL_PRIORITY: Record<string, number> = {
  Signal: 300,
  Zone: 200,
  Momentum: 100,
};
const PRIORITY_PIN_WINDOW_MS = 60_000;
const MINOR_EVENT_SUPPRESSION_WINDOW_MS = 45_000;
const SUPPRESSED_EVENT_DECAY_WINDOW_MS = 60_000;

export function buildRecentEventMemoryState(initialSymbol: string, initialEvents: RecentEvent[] = []): RecentEventMemoryState {
  return {
    [initialSymbol]: initialEvents.slice(0, MAX_RECENT_EVENTS_PER_SYMBOL),
  };
}

export function appendRecentEventToMemory(
  state: RecentEventMemoryState,
  symbol: string,
  event: RecentEvent,
): RecentEventMemoryState {
  return {
    ...state,
    [symbol]: [event, ...(state[symbol] ?? [])].slice(0, MAX_RECENT_EVENTS_PER_SYMBOL),
  };
}

function shouldGroupRecentEvents(previous: RecentEvent | undefined, incoming: RecentEvent): boolean {
  if (!previous) {
    return false;
  }

  if (previous.label !== incoming.label || previous.tone !== incoming.tone) {
    return false;
  }

  if (Math.abs(incoming.occurredAt - previous.occurredAt) > GROUPABLE_EVENT_WINDOW_MS) {
    return false;
  }

  return previous.detail === incoming.detail;
}

export function appendGroupedRecentEventToMemory(
  state: RecentEventMemoryState,
  symbol: string,
  event: RecentEvent,
): RecentEventMemoryState {
  const currentEvents = state[symbol] ?? [];
  const [latestEvent, ...restEvents] = currentEvents;

  if (suppressMinorRecentEventIfNeeded(currentEvents, event)) {
    return state;
  }

  if (!shouldGroupRecentEvents(latestEvent, event)) {
    return appendRecentEventToMemory(state, symbol, event);
  }

  const groupedEvent: RecentEvent = {
    ...event,
    repeatCount: (latestEvent.repeatCount ?? 1) + 1,
  };

  return {
    ...state,
    [symbol]: [groupedEvent, ...restEvents].slice(0, MAX_RECENT_EVENTS_PER_SYMBOL),
  };
}

export function getRecentEventsForSymbol(state: RecentEventMemoryState, symbol: string): RecentEvent[] {
  return state[symbol] ?? [];
}

export function incrementSuppressedRecentEventCount(
  state: SuppressedRecentEventCountState,
  symbol: string,
  now = Date.now(),
): SuppressedRecentEventCountState {
  return {
    ...state,
    [symbol]: {
      count: (state[symbol]?.count ?? 0) + 1,
      lastUpdatedAt: now,
    },
  };
}

export function resetSuppressedRecentEventCount(
  state: SuppressedRecentEventCountState,
  symbol: string,
): SuppressedRecentEventCountState {
  if (!(symbol in state)) {
    return state;
  }

  const nextState = { ...state };
  delete nextState[symbol];
  return nextState;
}

export function decaySuppressedRecentEventCounts(
  state: SuppressedRecentEventCountState,
  now = Date.now(),
): SuppressedRecentEventCountState {
  return Object.fromEntries(
    Object.entries(state).flatMap(([symbol, entry]) => {
      const decaySteps = Math.floor((now - entry.lastUpdatedAt) / SUPPRESSED_EVENT_DECAY_WINDOW_MS);
      if (decaySteps <= 0) {
        return [[symbol, entry] as const];
      }

      const nextCount = entry.count - decaySteps;
      if (nextCount <= 0) {
        return [];
      }

      return [[symbol, { count: nextCount, lastUpdatedAt: now }] as const];
    }),
  );
}

export function sanitizeSuppressedRecentEventCounts(state: unknown): SuppressedRecentEventCountState {
  if (!state || typeof state !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state as Record<string, unknown>).flatMap(([symbol, entry]) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const count = (entry as SuppressedRecentEventCountEntry).count;
      const lastUpdatedAt = (entry as SuppressedRecentEventCountEntry).lastUpdatedAt;
      if (!Number.isFinite(count) || !Number.isFinite(lastUpdatedAt) || count <= 0) {
        return [];
      }

      return [[symbol, { count, lastUpdatedAt }] as const];
    }),
  );
}

export function readPersistedSuppressedRecentEventCounts(): SuppressedRecentEventCountState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SUPPRESSED_RECENT_EVENT_COUNT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return sanitizeSuppressedRecentEventCounts(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function persistSuppressedRecentEventCounts(state: SuppressedRecentEventCountState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SUPPRESSED_RECENT_EVENT_COUNT_STORAGE_KEY,
      JSON.stringify(sanitizeSuppressedRecentEventCounts(state)),
    );
  } catch {
    return;
  }
}

export function normalizeSuppressedRecentEventHistoryDismissedKeys(keys: string[] | null | undefined): string[] {
  return mergeSuppressedRecentEventHistoryDismissedKeys(
    (keys ?? []).sort((left, right) => {
      const [, leftRawTimestamp] = left.split(":", 3);
      const [, rightRawTimestamp] = right.split(":", 3);
      const leftTimestamp = Number(leftRawTimestamp);
      const rightTimestamp = Number(rightRawTimestamp);
      const normalizedLeftTimestamp = Number.isFinite(leftTimestamp) ? leftTimestamp : Number.NEGATIVE_INFINITY;
      const normalizedRightTimestamp = Number.isFinite(rightTimestamp) ? rightTimestamp : Number.NEGATIVE_INFINITY;
      return normalizedRightTimestamp - normalizedLeftTimestamp;
    }),
    [],
  );
}

export function sanitizeSuppressedRecentEventHistoryDismissals(state: unknown): SuppressedRecentEventHistoryDismissState {
  if (!state || typeof state !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state as Record<string, unknown>).flatMap(([symbol, value]) => {
      if (!Array.isArray(value)) {
        return [];
      }

      const sanitizedQueue = normalizeSuppressedRecentEventHistoryDismissedKeys(
        value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0),
      );
      if (sanitizedQueue.length === 0) {
        return [];
      }

      return [[symbol, sanitizedQueue] as const];
    }),
  );
}

export function readPersistedSuppressedRecentEventHistoryDismissals(): SuppressedRecentEventHistoryDismissState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SUPPRESSED_RECENT_EVENT_HISTORY_DISMISS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return sanitizeSuppressedRecentEventHistoryDismissals(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function persistSuppressedRecentEventHistoryDismissals(state: SuppressedRecentEventHistoryDismissState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SUPPRESSED_RECENT_EVENT_HISTORY_DISMISS_STORAGE_KEY,
      JSON.stringify(sanitizeSuppressedRecentEventHistoryDismissals(state)),
    );
  } catch {
    return;
  }
}

export function pushSuppressedRecentEventHistoryDismissal(
  dismissals: SuppressedRecentEventHistoryDismissState,
  symbol: string,
  dismissalKey: string,
): SuppressedRecentEventHistoryDismissState {
  const currentQueue = dismissals[symbol] ?? [];
  const nextQueue = normalizeSuppressedRecentEventHistoryDismissedKeys([dismissalKey, ...currentQueue]);

  if (
    currentQueue.length === nextQueue.length &&
    currentQueue.every((entry, index) => entry === nextQueue[index])
  ) {
    return dismissals;
  }

  return {
    ...dismissals,
    [symbol]: nextQueue,
  };
}

export function pruneSuppressedRecentEventHistoryDismissals(
  dismissals: SuppressedRecentEventHistoryDismissState,
  suppressedCounts: SuppressedRecentEventCountState,
): SuppressedRecentEventHistoryDismissState {
  let didChange = false;
  const nextEntries = Object.entries(dismissals).flatMap(([symbol, dismissalQueue]) => {
    const activeEntry = suppressedCounts[symbol];
    if (!activeEntry || activeEntry.count <= 0) {
      didChange = true;
      return [];
    }

    const minActiveTimestamp = activeEntry.lastUpdatedAt - SUPPRESSED_EVENT_DECAY_WINDOW_MS;
    const filteredQueue = dismissalQueue.filter((dismissalKey) => {
      const [, rawTimestamp] = dismissalKey.split(":", 3);
      const timestamp = Number(rawTimestamp);
      return Number.isFinite(timestamp) && timestamp >= minActiveTimestamp && timestamp <= activeEntry.lastUpdatedAt;
    });

    if (filteredQueue.length !== dismissalQueue.length) {
      didChange = true;
    }

    if (filteredQueue.length === 0) {
      didChange = true;
      return [];
    }

    return [[symbol, filteredQueue] as const];
  });

  if (!didChange) {
    return dismissals;
  }

  return Object.fromEntries(nextEntries);
}

export function mergeSuppressedRecentEventHistoryDismissedKeys(
  primaryKeys: string[] | null | undefined,
  secondaryKeys: string[] | null | undefined,
): string[] {
  return [...(primaryKeys ?? []), ...(secondaryKeys ?? [])].filter(
    (entry, index, queue) => typeof entry === "string" && entry.length > 0 && queue.indexOf(entry) === index,
  ).slice(0, MAX_SUPPRESSED_HISTORY_DISMISSALS_PER_SYMBOL);
}

export function getSuppressedRecentEventHistoryDismissedKeysForSymbol(
  localDismissals: SuppressedRecentEventHistoryDismissState | null | undefined,
  symbol: string,
  persistedKeys: string[] | null | undefined,
): string[] {
  return mergeSuppressedRecentEventHistoryDismissedKeys(localDismissals?.[symbol], persistedKeys);
}

export function pruneSuppressedRecentEventHistoryDismissalsForSymbol(
  dismissals: SuppressedRecentEventHistoryDismissState,
  symbol: string,
  activeEntry: SuppressedRecentEventCountEntry | undefined,
): SuppressedRecentEventHistoryDismissState {
  const currentQueue = dismissals[symbol];
  if (!currentQueue) {
    return dismissals;
  }

  const nextQueue = pruneSuppressedRecentEventHistoryDismissals(
    { [symbol]: currentQueue },
    activeEntry ? { [symbol]: activeEntry } : {},
  )[symbol];

  if (nextQueue === currentQueue) {
    return dismissals;
  }

  if (!nextQueue || nextQueue.length === 0) {
    const nextDismissals = { ...dismissals };
    delete nextDismissals[symbol];
    return nextDismissals;
  }

  return {
    ...dismissals,
    [symbol]: nextQueue,
  };
}

export function formatSuppressedRecentEventBadgeLabel(
  entry: SuppressedRecentEventCountEntry | undefined,
  now = Date.now(),
): string | null {
  if (!entry || entry.count <= 0) {
    return null;
  }

  const remainingMs = Math.max(0, SUPPRESSED_EVENT_DECAY_WINDOW_MS - (now - entry.lastUpdatedAt));
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `+${entry.count} momentum filtered · decays in ${remainingSeconds}s`;
}

export function getSuppressedRecentEventHistoryDismissalCount(dismissedKeys: string[] | null | undefined): number {
  return dismissedKeys?.length ?? 0;
}

export function formatSuppressedRecentEventHistoryDismissalBadgeLabel(
  dismissedKeys: string[] | null | undefined,
  now = Date.now(),
): string | null {
  const count = getSuppressedRecentEventHistoryDismissalCount(dismissedKeys);
  if (count <= 0) {
    return null;
  }

  const timestamp = getSuppressedRecentEventHistoryDismissalLatestTimestamp(dismissedKeys);
  if (timestamp === null) {
    return `${count} hidden`;
  }

  return `${count} hidden · latest ${formatRecentEventRelativeTime(timestamp, now)}`;
}

export function getSuppressedRecentEventHistorySource(events: RecentEvent[]): string {
  const latestMajorEvent = events.find((event) => event.label === "Zone" || event.label === "Signal");
  if (!latestMajorEvent) {
    return "latest major event";
  }

  return latestMajorEvent.label === "Zone" ? "latest zone shift" : "latest signal";
}

export function getSuppressedRecentEventHistoryDismissKey(
  entry: SuppressedRecentEventCountEntry | undefined,
  sourceLabel = "latest signal",
): string | null {
  if (!entry || entry.count <= 0) {
    return null;
  }

  return `${entry.count}:${entry.lastUpdatedAt}:${sourceLabel}`;
}

export function isSuppressedRecentEventHistoryDismissed(
  entry: SuppressedRecentEventCountEntry | undefined,
  dismissedKeys: string[] | null | undefined,
  sourceLabel = "latest signal",
): boolean {
  if (!dismissedKeys || dismissedKeys.length === 0) {
    return false;
  }

  const currentKey = getSuppressedRecentEventHistoryDismissKey(entry, sourceLabel);
  return currentKey ? dismissedKeys.includes(currentKey) : false;
}

export function formatSuppressedRecentEventHistoryLabel(
  entry: SuppressedRecentEventCountEntry | undefined,
  sourceLabel = "latest signal",
): string | null {
  if (!entry || entry.count <= 0) {
    return null;
  }

  return `${entry.count} weak momentum updates filtered after ${sourceLabel}`;
}

export function formatRecentEventRelativeTime(occurredAt: number, now = Date.now()): string {
  const elapsedMs = Math.max(0, now - occurredAt);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds < 5) {
    return "just now";
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export function getSuppressedRecentEventHistoryDismissalLatestTimestamp(
  dismissedKeys: string[] | null | undefined,
): number | null {
  let latestTimestamp: number | null = null;

  for (const key of dismissedKeys ?? []) {
    const [, rawTimestamp] = key.split(":", 3);
    const timestamp = Number(rawTimestamp);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    latestTimestamp = latestTimestamp === null ? timestamp : Math.max(latestTimestamp, timestamp);
  }

  return latestTimestamp;
}

export function shouldStartRecentEventRailTickerForDismissedKeys(dismissedKeys: string[] | null | undefined): boolean {
  return getSuppressedRecentEventHistoryDismissalLatestTimestamp(dismissedKeys) !== null;
}

export function shouldStartRecentEventRailTicker({
  eventsCount,
  suppressedRecentEventCount,
  hiddenHistoryCount,
}: {
  eventsCount: number;
  suppressedRecentEventCount: number;
  hiddenHistoryCount: number;
}): boolean {
  return eventsCount > 0 || suppressedRecentEventCount > 0 || hiddenHistoryCount > 0;
}

export function suppressMinorRecentEventIfNeeded(
  currentEvents: RecentEvent[],
  incomingEvent: RecentEvent,
): boolean {
  if (incomingEvent.label !== "Momentum") {
    return false;
  }

  const latestImportantEvent = currentEvents.find((event) => event.label === "Signal" || event.label === "Zone");
  if (!latestImportantEvent) {
    return false;
  }

  const elapsedMs = incomingEvent.occurredAt - latestImportantEvent.occurredAt;
  if (elapsedMs < 0 || elapsedMs > MINOR_EVENT_SUPPRESSION_WINDOW_MS) {
    return false;
  }

  return incomingEvent.detail.toLowerCase().includes("weak");
}

export function isRecentEventPinned(event: RecentEvent, now = Date.now()): boolean {
  return now - event.occurredAt <= PRIORITY_PIN_WINDOW_MS;
}

export function getRecentEventPinRemainingLabel(event: RecentEvent, now = Date.now()): string | null {
  if (!isRecentEventPinned(event, now)) {
    return null;
  }

  const remainingMs = Math.max(0, PRIORITY_PIN_WINDOW_MS - (now - event.occurredAt));
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `pinned ${remainingSeconds}s`;
}

function getRecentEventPriorityScore(event: RecentEvent): number {
  const labelScore = EVENT_LABEL_PRIORITY[event.label] ?? 0;
  const toneScore = event.tone === "warn" ? 30 : event.tone === "bull" || event.tone === "bear" ? 20 : 10;
  const repeatScore = Math.min(event.repeatCount ?? 1, 9);

  return labelScore + toneScore + repeatScore;
}

function getPinnedRecentEventPriorityScore(event: RecentEvent, now: number): number {
  const baseScore = getRecentEventPriorityScore(event);
  const isPinned = isRecentEventPinned(event, now);

  if (!isPinned) {
    return baseScore;
  }

  return baseScore + (event.repeatCount ?? 1) * 10;
}

export function prioritizeRecentEventsForDisplay(
  events: RecentEvent[],
  options: { now?: number } = {},
): RecentEvent[] {
  const now = options.now ?? Date.now();

  return [...events].sort((left, right) => {
    const scoreDelta = getPinnedRecentEventPriorityScore(right, now) - getPinnedRecentEventPriorityScore(left, now);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return right.occurredAt - left.occurredAt;
  });
}

export function sanitizeRecentEventMemoryState(state: unknown): RecentEventMemoryState {
  if (!state || typeof state !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state as Record<string, unknown>).map(([symbol, events]) => [
      symbol,
      Array.isArray(events)
        ? events
            .filter(
              (event): event is RecentEvent =>
                !!event &&
                typeof event === "object" &&
                typeof (event as RecentEvent).id === "string" &&
                typeof (event as RecentEvent).label === "string" &&
                typeof (event as RecentEvent).detail === "string" &&
                VALID_EVENT_TONES.has((event as RecentEvent).tone) &&
                typeof (event as RecentEvent).timeLabel === "string" &&
                typeof (event as RecentEvent).occurredAt === "number" &&
                (typeof (event as RecentEvent).repeatCount === "undefined" || typeof (event as RecentEvent).repeatCount === "number"),
            )
            .slice(0, MAX_RECENT_EVENTS_PER_SYMBOL)
        : [],
    ]),
  );
}

export function readPersistedRecentEventMemory(): RecentEventMemoryState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RECENT_EVENT_MEMORY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return sanitizeRecentEventMemoryState(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function persistRecentEventMemory(state: RecentEventMemoryState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENT_EVENT_MEMORY_STORAGE_KEY,
      JSON.stringify(sanitizeRecentEventMemoryState(state)),
    );
  } catch {
    return;
  }
}
