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
    <section className={`premium-glass rounded-2xl border border-terminal-border bg-terminal-panel p-4 shadow-glow transition-all ${flashMap[String(flash) as keyof typeof flashMap]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-terminal-muted">{label}</p>
        {changeHint ? <span className="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-[11px] font-medium text-terminal-muted">{changeHint}</span> : null}
      </div>
      <p className={`mt-3 text-xl font-semibold ${accentMap[accent]}`}>{value}</p>
    </section>
  );
}
