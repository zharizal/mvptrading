import type { Period } from "./reports";

/** Format numbers to 2 decimal places. */
export function fNum(val: number | null | undefined, placeholder = "—"): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return placeholder;
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Return text-terminal-green or text-terminal-red based on sign. */
export function tone(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val) || val === 0) {
    return "text-terminal-text";
  }
  return val > 0 ? "text-terminal-green" : "text-terminal-red";
}
