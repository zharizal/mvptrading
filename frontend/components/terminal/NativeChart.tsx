"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketSnapshot } from "@/lib/types";

interface NativeChartProps {
  snapshot: MarketSnapshot;
  tradingviewSymbol?: string | null;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export function NativeChart({ snapshot, tradingviewSymbol }: NativeChartProps) {
  // Use a unique container ID per symbol so React fully unmounts the previous iframe
  const symbol = tradingviewSymbol ?? `BINANCE:${snapshot.resolved_symbol.replace(/[-/]/g, "")}`;
  const containerId = `tv_chart_${symbol.replace(/[^A-Z0-9]/g, "")}`;
  const scriptId = "tv_script_id";

  useEffect(() => {
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let tvWidget: any;
    let tvTimer: NodeJS.Timeout;

    const createWidget = () => {
      const container = document.getElementById(containerId);
      if (!container) return; // Unmounted

      if (typeof window.TradingView !== "undefined") {
        tvWidget = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: "15",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          backgroundColor: "#0A0E17",
          gridColor: "#1E222D",
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          toolbar_bg: "#131722",
          allow_symbol_change: true,
          details: true,
          hotlist: true,
          calendar: true,
          studies: [
            "Volume@tv-basicstudies",
            "RSI@tv-basicstudies"
          ],
        });
      } else {
        tvTimer = setTimeout(createWidget, 100);
      }
    };

    createWidget();

    return () => {
      clearTimeout(tvTimer);
      if (tvWidget && typeof tvWidget.remove === "function") {
        tvWidget.remove();
      }
    };
  }, [symbol, containerId]);

  return (
    <div key={containerId} className="h-full w-full" id={containerId} />
  );
}
