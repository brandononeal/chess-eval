import { Chess } from "chess.js";
import type { IssueSeverity } from "./types";

export const SEVERITY_TEXT: Record<IssueSeverity, string> = {
  blunder: "text-blunder",
  mistake: "text-mistake",
  inaccuracy: "text-inaccuracy",
};

export const SEVERITY_GLYPH: Record<IssueSeverity, string> = {
  blunder: "??",
  mistake: "?",
  inaccuracy: "?!",
};

/** For SVG fills, where Tailwind classes don't reach. */
export const SEVERITY_VAR: Record<IssueSeverity, string> = {
  blunder: "var(--severity-blunder)",
  mistake: "var(--severity-mistake)",
  inaccuracy: "var(--severity-inaccuracy)",
};

export function sanBetween(fenBefore: string, fenAfter: string): string {
  try {
    const chess = new Chess(fenBefore);
    const move = chess
      .moves({ verbose: true })
      .find((m) => m.after === fenAfter);
    return move?.san ?? "";
  } catch {
    return "";
  }
}

export function formatEval(cp: number): string {
  const pawns = Math.abs(cp) / 100;
  // True minus (U+2212) so negative evals align with tabular figures.
  const sign = cp > 0 ? "+" : cp < 0 ? "−" : "";
  return `${sign}${pawns.toFixed(1)}`;
}

export function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function winRate(wins: number, draws: number, games: number): string {
  if (games === 0) return "—";
  return `${Math.round(((wins + draws / 2) / games) * 100)}%`;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
