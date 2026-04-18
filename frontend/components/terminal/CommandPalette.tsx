"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import type { CatalogSymbol } from "@/lib/symbols";
import type { WatchlistItem } from "@/lib/watchlist";
import { formatTerminalSymbol, toWatchlistItem } from "@/lib/watchlist";

interface CommandPaletteProps {
  catalog: CatalogSymbol[] | null;
  onSelectWatchSymbol: (item: WatchlistItem) => void;
}

export function CommandPalette({ catalog, onSelectWatchSymbol }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // cmd+k / ctrl+k to open palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // Go-to shortcuts (only if not focused in an input)
      if (
        !open &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (e.key === "g") {
          // Listen for next key combo
          const handleNext = (e2: KeyboardEvent) => {
            const params = new URLSearchParams(searchParams.toString());
            let changed = false;
            switch (e2.key) {
              case "s": params.delete("tab"); changed = true; break;
              case "j": params.set("tab", "journal"); changed = true; break;
              case "a": params.set("tab", "analytics"); changed = true; break;
              case "l": params.set("tab", "lesson"); changed = true; break;
            }
            if (changed) {
              e2.preventDefault();
              const qs = params.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
            }
            document.removeEventListener("keydown", handleNext);
          };
          document.addEventListener("keydown", handleNext, { once: true });
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, router, pathname, searchParams]);

  if (!open) return null;

  const results = catalog
    ? catalog.filter((c) =>
        c.canonical_symbol.toLowerCase().includes(query.toLowerCase()) ||
        c.display_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  const executeAction = (action: () => void) => {
    action();
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-terminal-border bg-terminal-panel shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-terminal-border px-4 py-3">
          <span className="text-terminal-cyan">❯</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol (e.g. XAU) or type a command..."
            className="w-full bg-transparent text-sm text-terminal-text outline-none placeholder:text-terminal-muted"
          />
          <kbd className="rounded border border-terminal-border bg-black/20 px-2 py-0.5 text-[10px] text-terminal-muted">ESC</kbd>
        </div>

        {query && results.length > 0 ? (
          <div className="p-2">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-terminal-muted">
              Symbols
            </div>
            {results.map((c) => (
              <button
                key={c.canonical_symbol}
                onClick={() => executeAction(() => onSelectWatchSymbol(toWatchlistItem(c)))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-terminal-text hover:bg-white/5"
              >
                <span>{formatTerminalSymbol(c.canonical_symbol)}</span>
                <span className="text-xs text-terminal-muted">{c.display_name}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!query ? (
          <div className="p-2">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-terminal-muted">
              Navigation
            </div>
            {[
              { label: "Go to Signal", key: "g s", tab: undefined },
              { label: "Go to Journal", key: "g j", tab: "journal" },
              { label: "Go to Analytics", key: "g a", tab: "analytics" },
              { label: "Go to Lessons", key: "g l", tab: "lesson" },
            ].map((nav) => (
              <button
                key={nav.label}
                onClick={() => executeAction(() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (nav.tab) params.set("tab", nav.tab);
                  else params.delete("tab");
                  const qs = params.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                })}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-terminal-text hover:bg-white/5"
              >
                <span>{nav.label}</span>
                <kbd className="rounded border border-terminal-border bg-black/20 px-2 py-0.5 text-[10px] text-terminal-muted">{nav.key}</kbd>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
