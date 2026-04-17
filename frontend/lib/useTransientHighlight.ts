"use client";

import { useCallback, useRef, useState } from "react";

export type HighlightState = "active" | null;

export function useTransientHighlight(durationMs = 1200) {
  const [highlight, setHighlight] = useState<HighlightState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setHighlight("active");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setHighlight(null);
    }, durationMs);
  }, [durationMs]);

  return { highlight, trigger };
}
