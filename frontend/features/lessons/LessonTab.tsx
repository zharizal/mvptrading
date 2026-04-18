"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { generateLesson, listLessons, type Lesson } from "./api";
import { LessonCard } from "./LessonCard";

export function LessonTab() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setLessons(await listLessons());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setErr(null);
    try {
      const newLesson = await generateLesson(period);
      setLessons([newLesson, ...lessons]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-terminal-muted">
          AI Weekly Review
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="rounded-lg border border-terminal-border bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-terminal-muted focus:border-terminal-cyan focus:outline-none"
            disabled={generating}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All-time</option>
          </select>
          <Button variant="primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate New Review"}
          </Button>
        </div>
      </div>

      {err ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-terminal-red">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-terminal-border bg-black/10 p-6 text-center text-sm text-terminal-muted">
          Loading lessons…
        </p>
      ) : lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Log some trades in the Journal first, then generate an AI review to get personalized feedback on your strengths and weaknesses."
          icon="🎓"
        />
      ) : (
        <div className="space-y-6">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}
