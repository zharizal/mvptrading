"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, CrosshairMode, ColorType, CandlestickSeries } from "lightweight-charts";
import type { MarketSnapshot } from "@/lib/types";

interface NativeChartProps {
  snapshot: MarketSnapshot;
}

export function NativeChart({ snapshot }: NativeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick", any> | null>(null);
  const entryLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7f8ea3", // terminal-muted
      },
      grid: {
        vertLines: { color: "rgba(34, 197, 94, 0.05)" },
        horzLines: { color: "rgba(34, 197, 94, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#22d3ee", // terminal-cyan
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "#22d3ee",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#22d3ee",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(27, 42, 58, 1)", // terminal-border
      },
      timeScale: {
        borderColor: "rgba(27, 42, 58, 1)",
        timeVisible: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", // terminal-green
      downColor: "#ef4444", // terminal-red
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !snapshot.candles || snapshot.candles.length === 0) return;

    // Lightweight charts needs timestamp in seconds
    // Backend doesn't reliably send timestamps yet, so we mock fake timestamps
    // spaced by 15 minutes leading up to now if timestamp is missing.
    const nowS = Math.floor(new Date(snapshot.updated_at).getTime() / 1000);
    const intervalS = 15 * 60;

    const count = snapshot.candles.length;
    const formattedData = snapshot.candles.map((c, i) => {
      const t = c.timestamp ? Math.floor(c.timestamp / 1000) : nowS - ((count - 1 - i) * intervalS);
      return {
        time: t as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    });

    seriesRef.current.setData(formattedData);

    // Apply Price Lines for Signals
    const sig = snapshot.signal;
    if (sig.direction === "BUY" || sig.direction === "SELL") {
      // Clear old
      if (entryLineRef.current) seriesRef.current.removePriceLine(entryLineRef.current);
      if (tpLineRef.current) seriesRef.current.removePriceLine(tpLineRef.current);
      if (slLineRef.current) seriesRef.current.removePriceLine(slLineRef.current);

      entryLineRef.current = seriesRef.current.createPriceLine({
        price: sig.entry,
        color: "#22d3ee", // cyan
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "ENTRY",
      });

      tpLineRef.current = seriesRef.current.createPriceLine({
        price: sig.take_profit,
        color: "#22c55e", // green
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });

      slLineRef.current = seriesRef.current.createPriceLine({
        price: sig.stop_loss,
        color: "#ef4444", // red
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    } else {
      // Clear if WAIT
      if (entryLineRef.current) { seriesRef.current.removePriceLine(entryLineRef.current); entryLineRef.current = null; }
      if (tpLineRef.current) { seriesRef.current.removePriceLine(tpLineRef.current); tpLineRef.current = null; }
      if (slLineRef.current) { seriesRef.current.removePriceLine(slLineRef.current); slLineRef.current = null; }
    }

  }, [snapshot]);

  return <div ref={chartContainerRef} className="h-full min-h-[400px] w-full" />;
}
