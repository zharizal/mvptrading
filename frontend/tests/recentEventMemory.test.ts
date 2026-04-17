import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  decaySuppressedRecentEventCounts,
  formatRecentEventRelativeTime,
  formatSuppressedRecentEventBadgeLabel,
  formatSuppressedRecentEventHistoryDismissalBadgeLabel,
  formatSuppressedRecentEventHistoryLabel,
  getRecentEventPinRemainingLabel,
  getSuppressedRecentEventHistoryDismissKey,
  getSuppressedRecentEventHistoryDismissalCount,
  getSuppressedRecentEventHistoryDismissalLatestTimestamp,
  getSuppressedRecentEventHistorySource,
  getSuppressedRecentEventHistoryDismissedKeysForSymbol,
  mergeSuppressedRecentEventHistoryDismissedKeys,
  incrementSuppressedRecentEventCount,
  isSuppressedRecentEventHistoryDismissed,
  isRecentEventPinned,
  normalizeSuppressedRecentEventHistoryDismissedKeys,
  persistSuppressedRecentEventCounts,
  persistSuppressedRecentEventHistoryDismissals,
  prioritizeRecentEventsForDisplay,
  pruneSuppressedRecentEventHistoryDismissals,
  pruneSuppressedRecentEventHistoryDismissalsForSymbol,
  pushSuppressedRecentEventHistoryDismissal,
  readPersistedSuppressedRecentEventCounts,
  readPersistedSuppressedRecentEventHistoryDismissals,
  resetSuppressedRecentEventCount,
  sanitizeSuppressedRecentEventCounts,
  sanitizeSuppressedRecentEventHistoryDismissals,
  shouldStartRecentEventRailTicker,
  shouldStartRecentEventRailTickerForDismissedKeys,
  suppressMinorRecentEventIfNeeded,
  type RecentEvent,
} from "../lib/recentEventMemory";

test("formatRecentEventRelativeTime renders just now for fresh events", () => {
  assert.equal(formatRecentEventRelativeTime(1_000, 3_000), "just now");
});

test("formatRecentEventRelativeTime renders seconds for sub-minute events", () => {
  assert.equal(formatRecentEventRelativeTime(1_000, 15_000), "14s ago");
});

test("formatRecentEventRelativeTime renders minutes for older events", () => {
  assert.equal(formatRecentEventRelativeTime(1_000, 70_000), "1m ago");
});

test("formatRecentEventRelativeTime clamps future timestamps to just now", () => {
  assert.equal(formatRecentEventRelativeTime(5_000, 1_000), "just now");
});

test("shouldStartRecentEventRailTicker returns true when events exist", () => {
  assert.equal(shouldStartRecentEventRailTicker({ eventsCount: 1, suppressedRecentEventCount: 0, hiddenHistoryCount: 0 }), true);
});

test("shouldStartRecentEventRailTicker returns true when suppression countdown is active without events", () => {
  assert.equal(shouldStartRecentEventRailTicker({ eventsCount: 0, suppressedRecentEventCount: 2, hiddenHistoryCount: 0 }), true);
});

test("shouldStartRecentEventRailTicker returns true when hidden-history badge is active without events", () => {
  assert.equal(shouldStartRecentEventRailTicker({ eventsCount: 0, suppressedRecentEventCount: 0, hiddenHistoryCount: 1 }), true);
});

test("getSuppressedRecentEventHistoryDismissalLatestTimestamp returns newest valid timestamp", () => {
  assert.equal(
    getSuppressedRecentEventHistoryDismissalLatestTimestamp(["2:20000:latest zone shift", "1:10000:latest signal"]),
    20_000,
  );
});

test("getSuppressedRecentEventHistoryDismissalLatestTimestamp skips invalid leading keys when a later key is valid", () => {
  assert.equal(
    getSuppressedRecentEventHistoryDismissalLatestTimestamp(["oops", "2:20000:latest zone shift"]),
    20_000,
  );
});

test("getSuppressedRecentEventHistoryDismissalLatestTimestamp returns highest valid timestamp when queue order is dirty", () => {
  assert.equal(
    getSuppressedRecentEventHistoryDismissalLatestTimestamp(["1:10000:latest signal", "3:30000:latest zone shift", "2:20000:latest signal"]),
    30_000,
  );
});

test("getSuppressedRecentEventHistoryDismissalLatestTimestamp returns null for invalid keys", () => {
  assert.equal(getSuppressedRecentEventHistoryDismissalLatestTimestamp(["oops", "still-bad"]), null);
});

test("shouldStartRecentEventRailTickerForDismissedKeys returns true when newest hidden key has a valid timestamp", () => {
  assert.equal(shouldStartRecentEventRailTickerForDismissedKeys(["2:20000:latest zone shift"]), true);
});

test("shouldStartRecentEventRailTickerForDismissedKeys returns false when hidden keys have no valid timestamp", () => {
  assert.equal(shouldStartRecentEventRailTickerForDismissedKeys(["oops", "still-bad"]), false);
});

test("shouldStartRecentEventRailTicker returns false when nothing time-sensitive is visible", () => {
  assert.equal(shouldStartRecentEventRailTicker({ eventsCount: 0, suppressedRecentEventCount: 0, hiddenHistoryCount: 0 }), false);
});

test("prioritizeRecentEventsForDisplay keeps higher-severity events above newer low-severity ones", () => {
  const momentumEvent: RecentEvent = {
    id: "momentum-1",
    label: "Momentum",
    detail: "BULLISH building",
    tone: "bull",
    timeLabel: "10:00:10",
    occurredAt: 10_000,
  };
  const zoneEvent: RecentEvent = {
    id: "zone-1",
    label: "Zone",
    detail: "Zone changed SUPPORT → RESISTANCE",
    tone: "info",
    timeLabel: "10:00:09",
    occurredAt: 9_000,
  };
  const signalEvent: RecentEvent = {
    id: "signal-1",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:08",
    occurredAt: 8_000,
  };

  assert.deepEqual(prioritizeRecentEventsForDisplay([momentumEvent, zoneEvent, signalEvent]).map((event) => event.id), [
    "signal-1",
    "zone-1",
    "momentum-1",
  ]);
});

test("prioritizeRecentEventsForDisplay uses recency when severity tier matches", () => {
  const olderSignal: RecentEvent = {
    id: "signal-old",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 1_000,
  };
  const newerSignal: RecentEvent = {
    id: "signal-new",
    label: "Signal",
    detail: "Direction moved BUY → HOLD",
    tone: "warn",
    timeLabel: "10:00:05",
    occurredAt: 5_000,
  };

  assert.deepEqual(prioritizeRecentEventsForDisplay([olderSignal, newerSignal]).map((event) => event.id), [
    "signal-new",
    "signal-old",
  ]);
});

test("prioritizeRecentEventsForDisplay pins stronger events above same-tier newer ones inside the pin window", () => {
  const pinnedSignal: RecentEvent = {
    id: "signal-pinned",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
    repeatCount: 3,
  };
  const newerSignal: RecentEvent = {
    id: "signal-newer",
    label: "Signal",
    detail: "Direction moved BUY → HOLD",
    tone: "warn",
    timeLabel: "10:00:20",
    occurredAt: 20_000,
  };

  assert.deepEqual(
    prioritizeRecentEventsForDisplay([newerSignal, pinnedSignal], { now: 40_000 }).map((event) => event.id),
    ["signal-pinned", "signal-newer"],
  );
});

test("prioritizeRecentEventsForDisplay releases the pin after the window expires", () => {
  const stalePinnedSignal: RecentEvent = {
    id: "signal-pinned",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
    repeatCount: 3,
  };
  const newerSignal: RecentEvent = {
    id: "signal-newer",
    label: "Signal",
    detail: "Direction moved BUY → HOLD",
    tone: "warn",
    timeLabel: "10:00:20",
    occurredAt: 20_000,
  };

  assert.deepEqual(
    prioritizeRecentEventsForDisplay([newerSignal, stalePinnedSignal], { now: 200_000 }).map((event) => event.id),
    ["signal-newer", "signal-pinned"],
  );
});

test("suppressMinorRecentEventIfNeeded drops momentum updates right after a signal event", () => {
  const currentEvents: RecentEvent[] = [
    {
      id: "signal-1",
      label: "Signal",
      detail: "Direction moved HOLD → BUY",
      tone: "bull",
      timeLabel: "10:00:00",
      occurredAt: 10_000,
    },
  ];
  const incomingMomentum: RecentEvent = {
    id: "momentum-1",
    label: "Momentum",
    detail: "BULLISH weak · +0.18%",
    tone: "bull",
    timeLabel: "10:00:05",
    occurredAt: 15_000,
  };

  assert.equal(suppressMinorRecentEventIfNeeded(currentEvents, incomingMomentum), true);
});

test("suppressMinorRecentEventIfNeeded keeps momentum updates when no major event is active", () => {
  const currentEvents: RecentEvent[] = [
    {
      id: "momentum-prev",
      label: "Momentum",
      detail: "BULLISH weak · +0.10%",
      tone: "bull",
      timeLabel: "10:00:00",
      occurredAt: 10_000,
    },
  ];
  const incomingMomentum: RecentEvent = {
    id: "momentum-1",
    label: "Momentum",
    detail: "BULLISH weak · +0.18%",
    tone: "bull",
    timeLabel: "10:00:05",
    occurredAt: 15_000,
  };

  assert.equal(suppressMinorRecentEventIfNeeded(currentEvents, incomingMomentum), false);
});

test("isRecentEventPinned returns true inside the pin window", () => {
  const event: RecentEvent = {
    id: "signal-pinned",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
  };

  assert.equal(isRecentEventPinned(event, 40_000), true);
});

test("isRecentEventPinned returns false after the pin window expires", () => {
  const event: RecentEvent = {
    id: "signal-stale",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
  };

  assert.equal(isRecentEventPinned(event, 200_000), false);
});

test("getRecentEventPinRemainingLabel returns remaining seconds inside the pin window", () => {
  const event: RecentEvent = {
    id: "signal-pinned",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
  };

  assert.equal(getRecentEventPinRemainingLabel(event, 40_000), "pinned 30s");
});

test("getRecentEventPinRemainingLabel returns null after the pin window expires", () => {
  const event: RecentEvent = {
    id: "signal-stale",
    label: "Signal",
    detail: "Direction moved HOLD → BUY",
    tone: "bull",
    timeLabel: "10:00:00",
    occurredAt: 10_000,
  };

  assert.equal(getRecentEventPinRemainingLabel(event, 200_000), null);
});

test("incrementSuppressedRecentEventCount increments the current symbol counter", () => {
  assert.deepEqual(
    incrementSuppressedRecentEventCount({ BTCUSDT: { count: 1, lastUpdatedAt: 10_000 } }, "BTCUSDT", 20_000),
    { BTCUSDT: { count: 2, lastUpdatedAt: 20_000 } },
  );
});

test("incrementSuppressedRecentEventCount initializes missing symbol counters", () => {
  assert.deepEqual(
    incrementSuppressedRecentEventCount({}, "ETHUSDT", 20_000),
    { ETHUSDT: { count: 1, lastUpdatedAt: 20_000 } },
  );
});

test("resetSuppressedRecentEventCount clears only the selected symbol counter", () => {
  assert.deepEqual(
    resetSuppressedRecentEventCount({ BTCUSDT: { count: 3, lastUpdatedAt: 20_000 }, ETHUSDT: { count: 2, lastUpdatedAt: 10_000 } }, "BTCUSDT"),
    { ETHUSDT: { count: 2, lastUpdatedAt: 10_000 } },
  );
});

test("resetSuppressedRecentEventCount leaves state unchanged when symbol is absent", () => {
  assert.deepEqual(
    resetSuppressedRecentEventCount({ ETHUSDT: { count: 2, lastUpdatedAt: 10_000 } }, "BTCUSDT"),
    { ETHUSDT: { count: 2, lastUpdatedAt: 10_000 } },
  );
});

test("decaySuppressedRecentEventCounts reduces stale counters over time", () => {
  assert.deepEqual(
    decaySuppressedRecentEventCounts(
      {
        BTCUSDT: { count: 3, lastUpdatedAt: 0 },
        ETHUSDT: { count: 1, lastUpdatedAt: 70_000 },
      },
      120_000,
    ),
    {
      BTCUSDT: { count: 1, lastUpdatedAt: 120_000 },
      ETHUSDT: { count: 1, lastUpdatedAt: 70_000 },
    },
  );
});

test("decaySuppressedRecentEventCounts drops entries that decay to zero", () => {
  assert.deepEqual(
    decaySuppressedRecentEventCounts(
      {
        BTCUSDT: { count: 1, lastUpdatedAt: 0 },
      },
      120_000,
    ),
    {},
  );
});

test("sanitizeSuppressedRecentEventCounts keeps only valid persisted entries", () => {
  assert.deepEqual(
    sanitizeSuppressedRecentEventCounts({
      BTCUSDT: { count: 2, lastUpdatedAt: 20_000 },
      ETHUSDT: { count: "oops", lastUpdatedAt: 30_000 },
    }),
    {
      BTCUSDT: { count: 2, lastUpdatedAt: 20_000 },
    },
  );
});

test("readPersistedSuppressedRecentEventCounts returns sanitized parsed storage payload", () => {
  const store = new Map<string, string>([
    [
      "terminal:suppressed-recent-event-counts",
      JSON.stringify({ BTCUSDT: { count: 3, lastUpdatedAt: 40_000 }, BAD: { count: "x", lastUpdatedAt: 1 } }),
    ],
  ]);

  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
      },
    },
  });

  try {
    assert.deepEqual(readPersistedSuppressedRecentEventCounts(), {
      BTCUSDT: { count: 3, lastUpdatedAt: 40_000 },
    });
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

test("persistSuppressedRecentEventCounts writes sanitized payload to storage", () => {
  const writes: Array<{ key: string; value: string }> = [];
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        setItem: (key: string, value: string) => writes.push({ key, value }),
      },
    },
  });

  try {
    persistSuppressedRecentEventCounts({
      BTCUSDT: { count: 2, lastUpdatedAt: 20_000 },
      BAD: { count: Number.NaN, lastUpdatedAt: 10_000 },
    } as never);

    assert.deepEqual(writes, [
      {
        key: "terminal:suppressed-recent-event-counts",
        value: JSON.stringify({ BTCUSDT: { count: 2, lastUpdatedAt: 20_000 } }),
      },
    ]);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

test("sanitizeSuppressedRecentEventHistoryDismissals keeps only valid string queue entries", () => {
  assert.deepEqual(
    sanitizeSuppressedRecentEventHistoryDismissals({
      BTCUSDT: ["2:20000:latest zone shift", "1:10000:latest signal"],
      ETHUSDT: 123,
      SOLUSDT: ["", 42, "3:40000:latest signal"],
    }),
    {
      BTCUSDT: ["2:20000:latest zone shift", "1:10000:latest signal"],
      SOLUSDT: ["3:40000:latest signal"],
    },
  );
});

test("normalizeSuppressedRecentEventHistoryDismissedKeys sorts, dedupes, and caps queues", () => {
  assert.deepEqual(
    normalizeSuppressedRecentEventHistoryDismissedKeys([
      "1:10000:latest signal",
      "5:50000:latest signal",
      "4:40000:latest signal",
      "4:40000:latest signal",
      "3:30000:latest zone shift",
      "2:20000:latest signal",
    ]),
    [
      "5:50000:latest signal",
      "4:40000:latest signal",
      "3:30000:latest zone shift",
      "2:20000:latest signal",
    ],
  );
});

test("sanitizeSuppressedRecentEventHistoryDismissals dedupes repeated keys and enforces dismissal cap", () => {
  assert.deepEqual(
    sanitizeSuppressedRecentEventHistoryDismissals({
      BTCUSDT: [
        "5:50000:latest signal",
        "4:40000:latest signal",
        "4:40000:latest signal",
        "3:30000:latest zone shift",
        "2:20000:latest signal",
        "1:10000:latest zone shift",
      ],
    }),
    {
      BTCUSDT: [
        "5:50000:latest signal",
        "4:40000:latest signal",
        "3:30000:latest zone shift",
        "2:20000:latest signal",
      ],
    },
  );
});

test("sanitizeSuppressedRecentEventHistoryDismissals reorders dirty persisted queues by latest timestamp first", () => {
  assert.deepEqual(
    sanitizeSuppressedRecentEventHistoryDismissals({
      BTCUSDT: [
        "1:10000:latest signal",
        "3:30000:latest zone shift",
        "2:20000:latest signal",
      ],
    }),
    {
      BTCUSDT: [
        "3:30000:latest zone shift",
        "2:20000:latest signal",
        "1:10000:latest signal",
      ],
    },
  );
});

test("readPersistedSuppressedRecentEventHistoryDismissals returns sanitized parsed storage payload", () => {
  const store = new Map<string, string>([
    [
      "terminal:suppressed-recent-event-history-dismissals",
      JSON.stringify({ BTCUSDT: ["2:20000:latest zone shift"], BAD: 123 }),
    ],
  ]);

  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
      },
    },
  });

  try {
    assert.deepEqual(readPersistedSuppressedRecentEventHistoryDismissals(), {
      BTCUSDT: ["2:20000:latest zone shift"],
    });
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

test("persistSuppressedRecentEventHistoryDismissals writes sanitized payload to storage", () => {
  const writes: Array<{ key: string; value: string }> = [];
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        setItem: (key: string, value: string) => writes.push({ key, value }),
      },
    },
  });

  try {
    persistSuppressedRecentEventHistoryDismissals({
      BTCUSDT: ["2:20000:latest zone shift"],
      BAD: 123 as never,
    });

    assert.deepEqual(writes, [
      {
        key: "terminal:suppressed-recent-event-history-dismissals",
        value: JSON.stringify({ BTCUSDT: ["2:20000:latest zone shift"] }),
      },
    ]);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

test("pushSuppressedRecentEventHistoryDismissal appends unique dismissal keys and keeps newest first", () => {
  assert.deepEqual(
    pushSuppressedRecentEventHistoryDismissal(
      {
        BTCUSDT: ["1:10000:latest signal"],
      },
      "BTCUSDT",
      "2:20000:latest zone shift",
    ),
    {
      BTCUSDT: ["2:20000:latest zone shift", "1:10000:latest signal"],
    },
  );
});

test("pushSuppressedRecentEventHistoryDismissal caps queue with a dedicated smaller limit and drops oldest keys", () => {
  assert.deepEqual(
    pushSuppressedRecentEventHistoryDismissal(
      {
        BTCUSDT: [
          "4:40000:latest signal",
          "3:30000:latest zone shift",
          "2:20000:latest signal",
          "1:10000:latest zone shift",
        ],
      },
      "BTCUSDT",
      "5:50000:latest signal",
    ),
    {
      BTCUSDT: [
        "5:50000:latest signal",
        "4:40000:latest signal",
        "3:30000:latest zone shift",
        "2:20000:latest signal",
      ],
    },
  );
});

test("pruneSuppressedRecentEventHistoryDismissals removes stale dismissal keys older than the active suppression window", () => {
  assert.deepEqual(
    pruneSuppressedRecentEventHistoryDismissals(
      {
        BTCUSDT: [
          "4:120000:latest signal",
          "2:30000:latest zone shift",
          "1:10000:latest signal",
        ],
      },
      {
        BTCUSDT: { count: 4, lastUpdatedAt: 120_000 },
      },
    ),
    {
      BTCUSDT: ["4:120000:latest signal"],
    },
  );
});

test("pruneSuppressedRecentEventHistoryDismissals removes symbols with no active suppression count", () => {
  assert.deepEqual(
    pruneSuppressedRecentEventHistoryDismissals(
      {
        BTCUSDT: ["2:20000:latest zone shift"],
        ETHUSDT: ["1:5000:latest signal"],
      },
      {
        ETHUSDT: { count: 1, lastUpdatedAt: 5_000 },
      },
    ),
    {
      ETHUSDT: ["1:5000:latest signal"],
    },
  );
});

test("pruneSuppressedRecentEventHistoryDismissals keeps state reference when nothing changes", () => {
  const dismissals = {
    ETHUSDT: ["1:5000:latest signal"],
  };

  assert.equal(
    pruneSuppressedRecentEventHistoryDismissals(dismissals, {
      ETHUSDT: { count: 1, lastUpdatedAt: 5_000 },
    }),
    dismissals,
  );
});

test("pruneSuppressedRecentEventHistoryDismissalsForSymbol removes local symbol queue when suppression is inactive", () => {
  assert.deepEqual(
    pruneSuppressedRecentEventHistoryDismissalsForSymbol(
      {
        BTCUSDT: ["2:20000:latest zone shift"],
        ETHUSDT: ["1:5000:latest signal"],
      },
      "BTCUSDT",
      undefined,
    ),
    {
      ETHUSDT: ["1:5000:latest signal"],
    },
  );
});

test("pruneSuppressedRecentEventHistoryDismissalsForSymbol keeps other symbols untouched", () => {
  const dismissals = {
    ETHUSDT: ["1:5000:latest signal"],
  };

  assert.equal(pruneSuppressedRecentEventHistoryDismissalsForSymbol(dismissals, "BTCUSDT", undefined), dismissals);
});

test("formatSuppressedRecentEventBadgeLabel renders momentum-specific copy with decay countdown", () => {
  assert.equal(
    formatSuppressedRecentEventBadgeLabel({ count: 2, lastUpdatedAt: 20_000 }, 50_000),
    "+2 momentum filtered · decays in 30s",
  );
});

test("formatSuppressedRecentEventBadgeLabel returns null for empty entries", () => {
  assert.equal(formatSuppressedRecentEventBadgeLabel(undefined), null);
});

test("getSuppressedRecentEventHistoryDismissalCount returns queue size", () => {
  assert.equal(getSuppressedRecentEventHistoryDismissalCount(["2:20000:latest zone shift", "1:10000:latest signal"]), 2);
});

test("mergeSuppressedRecentEventHistoryDismissedKeys dedupes overlapping local and persisted queues", () => {
  assert.deepEqual(
    mergeSuppressedRecentEventHistoryDismissedKeys(
      ["3:30000:latest signal", "2:20000:latest zone shift"],
      ["2:20000:latest zone shift", "1:10000:latest signal"],
    ),
    ["3:30000:latest signal", "2:20000:latest zone shift", "1:10000:latest signal"],
  );
});

test("mergeSuppressedRecentEventHistoryDismissedKeys keeps newest-first order and applies dismissal cap", () => {
  assert.deepEqual(
    mergeSuppressedRecentEventHistoryDismissedKeys(
      ["5:50000:latest signal", "4:40000:latest signal", "3:30000:latest zone shift"],
      ["2:20000:latest signal", "1:10000:latest zone shift"],
    ),
    ["5:50000:latest signal", "4:40000:latest signal", "3:30000:latest zone shift", "2:20000:latest signal"],
  );
});

test("getSuppressedRecentEventHistoryDismissedKeysForSymbol scopes local dismissal queues to the active symbol", () => {
  assert.deepEqual(
    getSuppressedRecentEventHistoryDismissedKeysForSymbol(
      {
        BTCUSDT: ["3:30000:latest signal", "2:20000:latest zone shift"],
      },
      "ETHUSDT",
      ["1:10000:latest signal"],
    ),
    ["1:10000:latest signal"],
  );
});

test("getSuppressedRecentEventHistoryDismissedKeysForSymbol merges active-symbol local queue with persisted queue", () => {
  assert.deepEqual(
    getSuppressedRecentEventHistoryDismissedKeysForSymbol(
      {
        BTCUSDT: ["3:30000:latest signal", "2:20000:latest zone shift"],
        ETHUSDT: ["9:90000:latest signal"],
      },
      "BTCUSDT",
      ["2:20000:latest zone shift", "1:10000:latest signal"],
    ),
    ["3:30000:latest signal", "2:20000:latest zone shift", "1:10000:latest signal"],
  );
});

test("formatSuppressedRecentEventHistoryDismissalBadgeLabel renders hidden context count with newest age", () => {
  assert.equal(
    formatSuppressedRecentEventHistoryDismissalBadgeLabel(["2:20000:latest zone shift", "1:10000:latest signal"], 50_000),
    "2 hidden · latest 30s ago",
  );
});

test("formatSuppressedRecentEventHistoryDismissalBadgeLabel returns null for empty queues", () => {
  assert.equal(formatSuppressedRecentEventHistoryDismissalBadgeLabel([], 50_000), null);
});

test("formatSuppressedRecentEventHistoryLabel renders a subtle suppression summary", () => {
  assert.equal(
    formatSuppressedRecentEventHistoryLabel({ count: 2, lastUpdatedAt: 20_000 }, "latest signal"),
    "2 weak momentum updates filtered after latest signal",
  );
});

test("getSuppressedRecentEventHistorySource prefers the latest zone event when present", () => {
  assert.equal(
    getSuppressedRecentEventHistorySource([
      {
        id: "zone-1",
        label: "Zone",
        detail: "Zone changed SUPPORT → RESISTANCE",
        tone: "info",
        timeLabel: "10:00:05",
        occurredAt: 5_000,
      },
      {
        id: "signal-1",
        label: "Signal",
        detail: "Direction moved HOLD → BUY",
        tone: "bull",
        timeLabel: "10:00:00",
        occurredAt: 1_000,
      },
    ]),
    "latest zone shift",
  );
});

test("getSuppressedRecentEventHistoryDismissKey builds a stable key from current history context", () => {
  assert.equal(
    getSuppressedRecentEventHistoryDismissKey({ count: 2, lastUpdatedAt: 20_000 }, "latest zone shift"),
    "2:20000:latest zone shift",
  );
});

test("isSuppressedRecentEventHistoryDismissed only hides the exact dismissed history context", () => {
  assert.equal(
    isSuppressedRecentEventHistoryDismissed({ count: 2, lastUpdatedAt: 20_000 }, ["2:20000:latest zone shift"], "latest zone shift"),
    true,
  );
  assert.equal(
    isSuppressedRecentEventHistoryDismissed({ count: 3, lastUpdatedAt: 20_000 }, ["2:20000:latest zone shift"], "latest zone shift"),
    false,
  );
});

test("formatSuppressedRecentEventHistoryLabel returns null for empty entries", () => {
  assert.equal(formatSuppressedRecentEventHistoryLabel(undefined), null);
});
