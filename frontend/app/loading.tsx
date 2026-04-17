export default function Loading() {
  return (
    <main className="min-h-screen bg-terminal-bg p-6 text-terminal-text">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-6">
        <div className="h-24 rounded-2xl border border-terminal-border bg-terminal-panel" />
        <div className="h-20 rounded-2xl border border-terminal-border bg-terminal-panel" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-24 rounded-2xl border border-terminal-border bg-terminal-panel" />
          <div className="h-24 rounded-2xl border border-terminal-border bg-terminal-panel" />
          <div className="h-24 rounded-2xl border border-terminal-border bg-terminal-panel" />
          <div className="h-24 rounded-2xl border border-terminal-border bg-terminal-panel" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <div className="h-[520px] rounded-2xl border border-terminal-border bg-terminal-panel" />
          <div className="h-[720px] rounded-2xl border border-terminal-border bg-terminal-panel" />
          <div className="h-[520px] rounded-2xl border border-terminal-border bg-terminal-panel" />
        </div>
      </div>
    </main>
  );
}
