"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import type { MarketSnapshot } from "@/lib/types";
import { TradeForm } from "./TradeForm";
import { TradeTable } from "./TradeTable";
import { useJournal } from "./useJournal";
import type { TradeStatus } from "./api";

interface JournalTabProps {
  snapshot: MarketSnapshot;
}

type Filter = "all" | TradeStatus;

export function JournalTab({ snapshot }: JournalTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);

  const { trades, loading, error, createTrade, closeTrade, deleteTrade } = useJournal({
    status: filter === "all" ? undefined : filter,
  });

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status === "closed");
    const open = trades.filter((t) => t.status === "open");
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const winRate = closed.length === 0 ? 0 : (wins.length / closed.length) * 100;
    return {
      openCount: open.length,
      closedCount: closed.length,
      winRate,
      totalPnl,
    };
  }, [trades]);

  const handleCreate = async (payload: Parameters<typeof createTrade>[0]) => {
    await createTrade(payload);
    setFormOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={String(stats.openCount)} />
        <StatCard label="Closed" value={String(stats.closedCount)} />
        <StatCard
          label="Win rate"
          value={`${stats.winRate.toFixed(1)}%`}
          tone={stats.winRate >= 50 ? "green" : stats.winRate > 0 ? "red" : "muted"}
        />
        <StatCard
          label="Net PnL"
          value={stats.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          tone={stats.totalPnl >= 0 ? "green" : "red"}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["all", "open", "closed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                filter === f
                  ? "border-terminal-cyan bg-cyan-500/10 text-terminal-cyan"
                  : "border-terminal-border bg-black/10 text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close form" : "+ New trade"}
        </Button>
      </div>

      {formOpen ? (
        <TradeForm
          defaultSymbol={
            snapshot.resolved_symbol.includes("/")
              ? snapshot.resolved_symbol
              : snapshot.resolved_symbol.replace(/USDT$/, "/USDT")
          }
          defaultPrice={snapshot.price}
          onSubmit={handleCreate}
        />
      ) : null}

      {/* Table / states */}
      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-terminal-red">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-terminal-border bg-black/10 p-6 text-center text-sm text-terminal-muted">
          Loading trades…
        </p>
      ) : trades.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description="Log your first trade to start tracking performance, win rate, and R-multiples."
          action={
            !formOpen ? (
              <Button variant="primary" onClick={() => setFormOpen(true)}>
                Add first trade
              </Button>
            ) : undefined
          }
        />
      ) : (
        <TradeTable trades={trades} onClose={(id, exit) => closeTrade(id, { exit_price: exit }).then(() => undefined)} onDelete={deleteTrade} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "muted";
}) {
  const toneCls =
    tone === "green"
      ? "text-terminal-green"
      : tone === "red"
        ? "text-terminal-red"
        : "text-terminal-text";
  return (
    <div className="rounded-xl border border-terminal-border bg-black/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terminal-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}
