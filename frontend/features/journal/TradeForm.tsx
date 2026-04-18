"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { TradeCreatePayload, TradeDirection, TradeEmotion } from "./api";

interface TradeFormProps {
  defaultSymbol?: string;
  defaultPrice?: number;
  onSubmit: (payload: TradeCreatePayload) => Promise<void>;
}

const EMOTIONS: { value: TradeEmotion; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "confident", label: "Confident" },
  { value: "fomo", label: "FOMO" },
  { value: "revenge", label: "Revenge" },
  { value: "fear", label: "Fear" },
];

export function TradeForm({ defaultSymbol = "BTC/USDT", defaultPrice = 0, onSubmit }: TradeFormProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [direction, setDirection] = useState<TradeDirection>("BUY");
  const [entryPrice, setEntryPrice] = useState<string>(defaultPrice > 0 ? String(defaultPrice) : "");
  const [size, setSize] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [setupQuality, setSetupQuality] = useState<string>("3");
  const [emotion, setEmotion] = useState<TradeEmotion>("neutral");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const parseNum = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const entry = parseNum(entryPrice);
    const sz = parseNum(size);
    if (entry === null || entry <= 0) {
      setFormError("Entry price invalid");
      return;
    }
    if (sz === null || sz <= 0) {
      setFormError("Size invalid");
      return;
    }

    const payload: TradeCreatePayload = {
      symbol: symbol.trim().toUpperCase(),
      direction,
      entry_price: entry,
      size: sz,
      stop_loss: parseNum(stopLoss),
      take_profit: parseNum(takeProfit),
      setup_quality: parseNum(setupQuality) as number | null,
      emotion,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      setSize("");
      setStopLoss("");
      setTakeProfit("");
      setNotes("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit trade");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-terminal-border bg-black/10 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-terminal-muted">
        New Trade
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="BTC/USDT" />
        <Select
          label="Direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as TradeDirection)}
          options={[
            { value: "BUY", label: "BUY (Long)" },
            { value: "SELL", label: "SELL (Short)" },
          ]}
        />
        <Input label="Entry Price" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        <Input label="Size (quote ccy)" type="number" step="any" value={size} onChange={(e) => setSize(e.target.value)} hint="Notional in quote currency" />
        <Input label="Stop Loss" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} hint="Optional but recommended" />
        <Input label="Take Profit" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} hint="Optional" />
        <Select
          label="Setup Quality"
          value={setupQuality}
          onChange={(e) => setSetupQuality(e.target.value)}
          options={[
            { value: "1", label: "1 · Poor" },
            { value: "2", label: "2 · Weak" },
            { value: "3", label: "3 · Okay" },
            { value: "4", label: "4 · Strong" },
            { value: "5", label: "5 · Perfect" },
          ]}
        />
        <Select
          label="Emotion"
          value={emotion}
          onChange={(e) => setEmotion(e.target.value as TradeEmotion)}
          options={EMOTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terminal-muted">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Setup thesis, confluence, management plan…"
              className="rounded-lg border border-terminal-border bg-black/20 px-3 py-2 text-sm text-terminal-text placeholder:text-terminal-muted focus:border-terminal-cyan focus:outline-none focus:ring-1 focus:ring-terminal-cyan/40"
            />
          </label>
        </div>
      </div>

      {formError ? (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-terminal-red">
          {formError}
        </p>
      ) : null}

      <div className="mt-3 flex justify-end">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Add Trade"}
        </Button>
      </div>
    </form>
  );
}
