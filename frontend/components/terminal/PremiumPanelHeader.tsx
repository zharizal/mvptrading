import { ReactNode } from "react";

interface PremiumPanelHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

export function PremiumPanelHeader({ eyebrow, title, subtitle, rightContent }: PremiumPanelHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-terminal-muted">{eyebrow}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-terminal-cyan shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
          <h2 className="text-lg font-semibold text-terminal-text md:text-xl">{title}</h2>
        </div>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-terminal-muted">{subtitle}</p> : null}
      </div>
      {rightContent ? <div className="md:pt-1">{rightContent}</div> : null}
    </div>
  );
}
