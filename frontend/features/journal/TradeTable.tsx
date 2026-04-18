"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { Trade } from "./api";

interface TradeTableProps {
  trades: Trade[];
  onClose: (id: number, exitPrice: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function fmtNum(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function pnlTone(pnl: number | null): string {
  if (pnl === null) return "text-terminal-muted";
  return pnl >= 0 ? "text-terminal-green" : "text-terminal-red";
}

function CloseCell({ trade, onClose }: { trade: Trade; onClose: (id: number, exitPrice: number) => Promise<void> }) {
  const [exit, setExit] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const n = Number(exit);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Invalid exit");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await onClose(trade.id, n);
      setExit("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="any"
        value={exit}
        onChange={(e) => setExit(e.target.value)}
        placeholder="exit"
        className="w-20 rounded border border-terminal-border bg-black/30 px-2 py-1 text-xs text-terminal-text focus:border-terminal-cyan focus:outline-none"
      />
      <Button size="sm" variant="primary" onClick={submit} disabled={busy}>
        {busy ? "…" : "Close"}
      </Button>
      {err ? <span className="text-[10px] text-terminal-red">{err}</span> : null}
    </div>
  );
}

export function TradeTable({ trades, onClose, onDelete }: TradeTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-terminal-border bg-black/10">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-terminal-border bg-black/20 text-[11px] uppercase tracking-[0.12em] text-terminal-muted">
          <tr>
            <th className="px-3 py-2 text-left">Symbol</th>
            <th className="px-3 py-2 text-left">Dir</th>
            <th className="px-3 py-2 text-right">Entry</th>
            <th className="px-3 py-2 text-right">Exit</th>
            <th className="px-3 py-2 text-right">Size</th>
            <th className="px-3 py-2 text-right">SL / TP</th>
            <th className="px-3 py-2 text-right">PnL</th>
            <th className="px-3 py-2 text-right">R</th>
            <th className="px-3 py-2 text-left">Opened</th>
            <th className="px-3 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-terminal-border">
          {trades.map((t) => {
            const dirTone = t.direction === "BUY" ? "text-terminal-green" : "text-terminal-red";
            return (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">{t.symbol}</td>
                <td className={`px-3 py-2 font-semibold ${dirTone}`}>{t.direction}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(t.entry_price, 4)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(t.exit_price, 4)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(t.size, 2)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-terminal-muted">
                  {fmtNum(t.stop_loss, 2)} / {fmtNum(t.take_profit, 2)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums font-semibold ${pnlTone(t.pnl)}`}>
                  {fmtNum(t.pnl, 2)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${pnlTone(t.r_multiple)}`}>
                  {t.r_multiple !== null ? `${t.r_multiple >= 0 ? "+" : ""}${t.r_multiple.toFixed(2)}R` : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-terminal-muted">{fmtDate(t.entry_time)}</td>
                <td className="px-3 py-2 text-right">
                  {t.status === "open" ? (
                    <CloseCell trade={t} onClose={onClose} />
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => onDelete(t.id)}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
