"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { AnalyticsTab } from "@/features/analytics/AnalyticsTab";
import { JournalTab } from "@/features/journal/JournalTab";
import { LessonTab } from "@/features/lessons/LessonTab";
import { SignalTab } from "@/features/signal/SignalTab";
import type { MarketSnapshot } from "@/lib/types";

type TabId = "signal" | "journal" | "analytics" | "lesson";

const VALID_TABS: TabId[] = ["signal", "journal", "analytics", "lesson"];
const TAB_QUERY_KEY = "tab";

interface ChartTabsProps {
  snapshot: MarketSnapshot;
  signalFlash?: "active" | null;
  zoneFlash?: "active" | null;
}

function parseTab(value: string | null | undefined): TabId {
  if (value && (VALID_TABS as string[]).includes(value)) return value as TabId;
  return "signal";
}

export function ChartTabs({ snapshot, signalFlash, zoneFlash }: ChartTabsProps) {
  const searchParams = useSearchParams();

  const [activeId, setActiveId] = useState<TabId>(() =>
    parseTab(searchParams.get(TAB_QUERY_KEY)),
  );

  // Reconcile from URL in case of back/forward nav.
  useEffect(() => {
    const fromUrl = parseTab(searchParams.get(TAB_QUERY_KEY));
    setActiveId((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  const handleChange = useCallback(
    (id: string) => {
      const next = parseTab(id);
      setActiveId(next);

      // Use replaceState directly to avoid Next.js router re-rendering the
      // entire page on every tab click — which was the root cause of
      // "This page couldn't load" during rapid symbol/tab switching.
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (next === "signal") {
          url.searchParams.delete(TAB_QUERY_KEY);
        } else {
          url.searchParams.set(TAB_QUERY_KEY, next);
        }
        window.history.replaceState(null, "", url.toString());
      }
    },
    [],
  );

  const items: TabItem[] = useMemo(
    () => [
      { id: "signal", label: "Signal" },
      { id: "journal", label: "Journal" },
      { id: "analytics", label: "Analytics" },
      { id: "lesson", label: "Lesson" },
    ],
    [],
  );

  return (
    <section className="rounded border border-terminal-border bg-terminal-panel p-3">
      <Tabs
        items={items}
        activeId={activeId}
        onChange={handleChange}
        ariaLabel="Chart tabs"
      >
        {activeId === "signal" ? (
          <SignalTab snapshot={snapshot} signalFlash={signalFlash} zoneFlash={zoneFlash} />
        ) : null}
        {activeId === "journal" ? <JournalTab snapshot={snapshot} /> : null}
        {activeId === "analytics" ? <AnalyticsTab /> : null}
        {activeId === "lesson" ? <LessonTab /> : null}
      </Tabs>
    </section>
  );
}
