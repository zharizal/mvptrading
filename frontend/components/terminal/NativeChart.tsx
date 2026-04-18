"use client";

"use client";

import { useEffect, useRef } from "react";
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
  const containerId = "tv_chart_container";
  // Fallback to BINANCE if tradingviewSymbol is missing
  const symbol = tradingviewSymbol ?? `BINANCE:${snapshot.resolved_symbol.replace(/[-/]/g, "")}`;
  const scriptId = "tv_script_id";

  useEffect(() => {
    // Append the script only once
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/tv.js";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let tvWidget: any;
    let tvTimer: NodeJS.Timeout;

    const createWidget = () => {
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
          // Adding advanced tools
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
      if (tvWidget && tvWidget.remove) {
        tvWidget.remove();
      }
    };
  }, [symbol]);

  return <div id={containerId} className="h-full w-full" />;
}
