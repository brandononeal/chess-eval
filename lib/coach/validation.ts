import { Chess } from "chess.js";
import { STUDY_FOCI, TIME_CLASSES, type Drill, type StudyFocus } from "./types";

/** A game URL we're willing to store and later render as a link. */
export function isChessComGameUrl(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://www.chess.com/");
}

/**
 * A plausible Chess.com username (their rules: 3-25 letters, digits,
 * underscores, hyphens). Gates getOrCreateUserId so arbitrary strings
 * can't mint unbounded users rows.
 */
export function isChessComUsername(v: unknown): v is string {
  return typeof v === "string" && /^[a-zA-Z0-9_-]{3,25}$/.test(v);
}

export function isValidFen(fen: unknown): fen is string {
  if (typeof fen !== "string") return false;
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Rebuild a Drill from a known field allowlist, rejecting anything malformed.
 * The client POSTs the whole drill back on each attempt; without this an
 * attacker could persist arbitrary fields — including a `javascript:` gameUrl
 * that later renders into an <a href> (stored XSS).
 */
export function sanitizeDrill(raw: unknown): Drill | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  if (typeof d.id !== "string" || d.id.length === 0) return null;
  if (!isChessComGameUrl(d.gameUrl)) return null;
  if (d.userColor !== "w" && d.userColor !== "b") return null;
  if (!isValidFen(d.fen)) return null;

  const opponent = str(d.opponent);
  const playedSan = str(d.playedSan);
  const bestMoveSan = str(d.bestMoveSan);
  const swing = num(d.swing);
  const evalBefore = num(d.evalBefore);
  const moveNumber = num(d.moveNumber);
  if (opponent === null || playedSan === null || bestMoveSan === null)
    return null;
  if (swing === null || evalBefore === null || moveNumber === null) return null;

  // isReview is intentionally dropped — the server decides review status.
  return {
    id: d.id,
    gameUrl: d.gameUrl,
    opponent,
    fen: d.fen,
    userColor: d.userColor,
    playedSan,
    bestMoveSan,
    swing,
    evalBefore,
    moveNumber,
  };
}

const MAX_STUDY_MINUTES = 240;

export function parseStudySession(
  raw: unknown,
): { focus: StudyFocus; minutes: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const { focus, minutes } = raw as Record<string, unknown>;
  if (!STUDY_FOCI.includes(focus as StudyFocus)) return null;
  if (
    typeof minutes !== "number" ||
    !Number.isInteger(minutes) ||
    minutes <= 0 ||
    minutes > MAX_STUDY_MINUTES
  ) {
    return null;
  }
  return { focus: focus as StudyFocus, minutes };
}

/** Clamp a query-param number into [min, max]; empty/NaN/0 → fallback. */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n === 0) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A recognized time class, or "all" for anything else. */
export function normalizeTimeClass(tc: unknown): string {
  return typeof tc === "string" &&
    (TIME_CLASSES as readonly string[]).includes(tc)
    ? tc
    : "all";
}
