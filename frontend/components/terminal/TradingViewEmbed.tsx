"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TradingViewEmbedProps {
  symbol?: string;
  interval?: string;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const SCRIPT_ID = "tradingview-widget-script";

function ensureTradingViewScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.TradingView?.widget) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load TradingView script")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView script"));
    document.body.appendChild(script);
  });
}

export function TradingViewEmbed({ symbol = "BINANCE:BTCUSDT", interval = "15" }: TradingViewEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const widgetConfig = useMemo(
    () => ({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      container_id: "tradingview_terminal_chart",
      studies: ["Volume@tv-basicstudies"],
      backgroundColor: "#070b11",
      gridColor: "rgba(127, 142, 163, 0.12)",
      withdateranges: true,
    }),
    [interval, symbol],
  );

  useEffect(() => {
    let cancelled = false;

    async function mountWidget() {
      setHasError(false);
      setIsReady(false);

      try {
        await ensureTradingViewScript();

        if (cancelled || !containerRef.current || !window.TradingView?.widget) {
          return;
        }

        containerRef.current.innerHTML = "";

        const widgetNode = document.createElement("div");
        widgetNode.id = "tradingview_terminal_chart";
        widgetNode.className = "h-full w-full";
        containerRef.current.appendChild(widgetNode);
        widgetRef.current = widgetNode;

        new window.TradingView.widget(widgetConfig);
        setIsReady(true);
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    }

    mountWidget();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      widgetRef.current = null;
      setIsReady(false);
    };
  }, [widgetConfig]);

  if (hasError) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 text-center text-terminal-muted">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-terminal-red">Chart load failed</p>
          <p className="mt-2 text-sm text-terminal-text">TradingView script nggak bisa dimuat. Cek koneksi/network policy lalu reload.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-terminal-border bg-black/20">
      <div ref={containerRef} className="h-[420px] w-full" />
      {!isReady ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 text-sm text-terminal-muted">
          Loading chart...
        </div>
      ) : null}
    </div>
  );
}
