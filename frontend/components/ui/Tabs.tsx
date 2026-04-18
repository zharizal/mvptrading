"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: ReactNode;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Accessible, keyboard-driven tabs primitive.
 *
 * Usage:
 *   <Tabs items={[{id:'a',label:'A'},{id:'b',label:'B'}]} activeId={id} onChange={setId}>
 *     {id === 'a' ? <PanelA /> : <PanelB />}
 *   </Tabs>
 *
 * URL synchronization is the caller's responsibility — keep logic there so
 * the primitive remains reusable for modals / nested tabs.
 */
export function Tabs({ items, activeId, onChange, children, className, ariaLabel }: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, items.findIndex((t) => t.id === activeId));

  const focusTab = useCallback((index: number) => {
    const len = items.length;
    if (!len) return;
    const wrapped = ((index % len) + len) % len;
    onChange(items[wrapped].id);
    tabRefs.current[wrapped]?.focus();
  }, [items, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusTab(0);
        break;
      case "End":
        e.preventDefault();
        focusTab(items.length - 1);
        break;
    }
  };

  useEffect(() => {
    // Clamp refs array to current tabs length.
    tabRefs.current = tabRefs.current.slice(0, items.length);
  }, [items.length]);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap items-center gap-1 border-b border-terminal-border"
      >
        {items.map((item, index) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              id={`tab-${item.id}`}
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-terminal-cyan/40 ${
                isActive
                  ? "text-terminal-text"
                  : "text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {item.icon ? <span className="text-terminal-cyan">{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-terminal-border px-2 py-0.5 text-[10px] font-semibold text-terminal-muted">
                  {item.badge}
                </span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-terminal-cyan" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeId}`}
        aria-labelledby={`tab-${activeId}`}
        className="pt-4"
      >
        {children}
      </div>
    </div>
  );
}
