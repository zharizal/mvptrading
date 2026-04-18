interface MetricCardProps {
  label: string;
  value: string;
  accent?: "green" | "red" | "cyan" | "default";
  changeHint?: string;
  flash?: "up" | "down" | null;
}

const accentMap = {
  green: "text-terminal-green",
  red: "text-terminal-red",
  cyan: "text-terminal-cyan",
  default: "text-terminal-text",
};

const flashMap = {
  up: "metric-flash-up",
  down: "metric-flash-down",
  null: "",
};

export function MetricCard({ label, value, accent = "default", changeHint, flash = null }: MetricCardProps) {
  return (
    <section className={`rounded-xl border border-terminal-border bg-terminal-panel p-3 transition-all ${flashMap[String(flash) as keyof typeof flashMap]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-terminal-muted">{label}</p>
        {changeHint ? <span className="text-[10px] font-medium text-terminal-muted/70">{changeHint}</span> : null}
      </div>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${accentMap[accent]}`}>{value}</p>
    </section>
  );
}
