import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/** Surface container matching the terminal aesthetic. */
export function Card({ children, className, padded = true }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-terminal-border bg-terminal-panel shadow-glow ${
        padded ? "p-4" : ""
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-terminal-border bg-black/20 p-10 text-center">
      {icon ? <div className="text-3xl text-terminal-muted">{icon}</div> : null}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-terminal-text">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-sm text-xs text-terminal-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
