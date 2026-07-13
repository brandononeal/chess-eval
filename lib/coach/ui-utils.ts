import { Chess } from "chess.js";
import type { BucketTally, GameResult, IssueSeverity } from "./types";

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

// en-CA formats as YYYY-MM-DD. Formatters are cached because localDateKey
// runs in per-game/per-day loops and Intl construction is expensive.
const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Local calendar date key (YYYY-MM-DD) — the app's convention everywhere:
 * evening games belong to the day they were played, not the UTC day.
 *
 * "Local" means the given IANA `timeZone`, falling back to the process's
 * zone when omitted — correct in the browser, but server-side callers
 * (buildDaily, dailyActivity) key by the server's zone unless they pass the
 * user's zone or the deployment pins TZ to match.
 */
export function localDateKey(epochSeconds: number, timeZone?: string): string {
  const key = timeZone ?? "";
  let fmt = dateKeyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateKeyFormatters.set(key, fmt);
  }
  return fmt.format(new Date(epochSeconds * 1000));
}

export function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Score fraction with draws worth half; 0 when no games. */
export function scoreOf(o: {
  wins: number;
  draws: number;
  games: number;
}): number {
  return o.games > 0 ? (o.wins + o.draws / 2) / o.games : 0;
}

export function winRate(wins: number, draws: number, games: number): string {
  if (games === 0) return "—";
  return `${Math.round(scoreOf({ wins, draws, games }) * 100)}%`;
}

/** Blunder+mistake rate for a clock bucket. */
export function errorRate(b: BucketTally): number {
  return b.moves > 0 ? (b.blunders + b.mistakes) / b.moves : 0;
}

export const RESULT_GLYPH: Record<GameResult, string> = {
  win: "W",
  loss: "L",
  draw: "½",
};

export const RESULT_VAR: Record<GameResult, string> = {
  win: "var(--result-win)",
  loss: "var(--result-loss)",
  draw: "var(--result-draw)",
};

export const RESULT_LABEL: Record<GameResult, string> = {
  win: "Won",
  loss: "Lost",
  draw: "Drew",
};

export function colorName(color: "w" | "b"): string {
  return color === "w" ? "White" : "Black";
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
