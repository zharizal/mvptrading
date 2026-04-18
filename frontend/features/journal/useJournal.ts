"use client";

import { useCallback, useEffect, useState } from "react";

import {
  closeTrade as apiCloseTrade,
  createTrade as apiCreateTrade,
  deleteTrade as apiDeleteTrade,
  listTrades,
  type Trade,
  type TradeClosePayload,
  type TradeCreatePayload,
  type TradeStatus,
} from "./api";

interface UseJournalOptions {
  status?: TradeStatus;
  symbol?: string;
}

interface UseJournalResult {
  trades: Trade[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTrade: (payload: TradeCreatePayload) => Promise<Trade>;
  closeTrade: (id: number, payload: TradeClosePayload) => Promise<Trade>;
  deleteTrade: (id: number) => Promise<void>;
}

export function useJournal(options?: UseJournalOptions): UseJournalResult {
  const status = options?.status;
  const symbol = options?.symbol;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTrades({ status, symbol });
      setTrades(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }, [status, symbol]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTrade = useCallback(
    async (payload: TradeCreatePayload) => {
      const created = await apiCreateTrade(payload);
      await refresh();
      return created;
    },
    [refresh],
  );

  const closeTrade = useCallback(
    async (id: number, payload: TradeClosePayload) => {
      const closed = await apiCloseTrade(id, payload);
      await refresh();
      return closed;
    },
    [refresh],
  );

  const deleteTrade = useCallback(
    async (id: number) => {
      await apiDeleteTrade(id);
      await refresh();
    },
    [refresh],
  );

  return { trades, total, loading, error, refresh, createTrade, closeTrade, deleteTrade };
}
