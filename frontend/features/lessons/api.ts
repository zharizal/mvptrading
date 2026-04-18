const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface Lesson {
  id: number;
  period_start: string;
  period_end: string;
  trade_count: number | null;
  win_rate: number | null;
  net_r: number | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  patterns: string[] | null;
  recommendations: string[] | null;
  model_used: string | null;
  created_at: string;
}

export async function listLessons(limit = 10): Promise<Lesson[]> {
  const url = new URL("/lessons", API_BASE);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list lessons: ${res.status}`);
  return res.json() as Promise<Lesson[]>;
}

export async function generateLesson(period: "7d" | "30d" | "90d" | "all"): Promise<Lesson> {
  const url = new URL("/lessons/generate", API_BASE);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to generate lesson: ${res.status} ${text}`);
  }
  return res.json() as Promise<Lesson>;
}
