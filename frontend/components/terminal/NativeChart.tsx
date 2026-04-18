"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, CrosshairMode, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import type { MarketSnapshot } from "@/lib/types";

interface NativeChartProps {
  snapshot: MarketSnapshot;
}

export function NativeChart({ snapshot }: NativeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick", any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram", any> | null>(null);
  const entryLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0A0E17" }, // terminal-bg
        textColor: "#787B86", // terminal-muted
      },
      grid: {
        vertLines: { color: "rgba(30, 34, 45, 0.4)" }, // terminal-border
        horzLines: { color: "rgba(30, 34, 45, 0.4)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#2962FF", // cyan
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E222D",
        },
        horzLine: {
          color: "#2962FF",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1E222D",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(30, 34, 45, 1)",
      },
      timeScale: {
        borderColor: "rgba(30, 34, 45, 1)",
        timeVisible: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#089981", // green
      downColor: "#F23645", // red
      borderVisible: false,
      wickUpColor: "#089981",
      wickDownColor: "#F23645",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#1E222D", // base color
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // overlays volume on main chart
    });

    // Scale the volume to max 25% of the chart height from bottom
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener("resize", handleResize);

    // Trigger initial resize
    setTimeout(handleResize, 50);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeSeriesRef.current || !snapshot.candles || snapshot.candles.length === 0) return;

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

    const formattedVolume = snapshot.candles.map((c, i) => {
      const t = c.timestamp ? Math.floor(c.timestamp / 1000) : nowS - ((count - 1 - i) * intervalS);
      const isUp = c.close >= c.open;
      return {
        time: t as any,
        value: c.volume,
        color: isUp ? "rgba(8, 153, 129, 0.2)" : "rgba(242, 54, 69, 0.2)",
      };
    });

    seriesRef.current.setData(formattedData);
    volumeSeriesRef.current.setData(formattedVolume);

    // Apply Price Lines
    const sig = snapshot.signal;
    if (sig.direction === "BUY" || sig.direction === "SELL") {
      if (entryLineRef.current) seriesRef.current.removePriceLine(entryLineRef.current);
      if (tpLineRef.current) seriesRef.current.removePriceLine(tpLineRef.current);
      if (slLineRef.current) seriesRef.current.removePriceLine(slLineRef.current);

      entryLineRef.current = seriesRef.current.createPriceLine({
        price: sig.entry,
        color: "#2962FF",
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "ENTRY",
      });

      tpLineRef.current = seriesRef.current.createPriceLine({
        price: sig.take_profit,
        color: "#089981",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "TP",
      });

      slLineRef.current = seriesRef.current.createPriceLine({
        price: sig.stop_loss,
        color: "#F23645",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SL",
      });
    } else {
      if (entryLineRef.current) { seriesRef.current.removePriceLine(entryLineRef.current); entryLineRef.current = null; }
      if (tpLineRef.current) { seriesRef.current.removePriceLine(tpLineRef.current); tpLineRef.current = null; }
      if (slLineRef.current) { seriesRef.current.removePriceLine(slLineRef.current); slLineRef.current = null; }
    }

  }, [snapshot]);

  return <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />;
}
