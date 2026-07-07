import { Chess } from "chess.js";
import type { CoachGame, GameResult } from "./types";

const API = "https://api.chess.com/pub/player";
const USER_AGENT = "chess-eval-coach (personal training dashboard)";

interface ApiPlayer {
  username: string;
  rating: number;
  result: string;
}

interface ApiGame {
  url: string;
  pgn?: string;
  end_time: number;
  time_class: string;
  time_control?: string;
  rules: string;
  white: ApiPlayer;
  black: ApiPlayer;
}

const DRAW_RESULTS = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "50move",
  "timevsinsufficient",
]);

function toResult(apiResult: string): GameResult {
  if (apiResult === "win") return "win";
  if (DRAW_RESULTS.has(apiResult)) return "draw";
  return "loss";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Chess.com API ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

// Past month archives are immutable; the current month changes as games
// finish. Cache accordingly so range/filter clicks don't refetch megabytes
// of PGN. Stored on globalThis to survive dev-mode module reloads.
const CURRENT_MONTH_TTL_MS = 5 * 60_000;
const g = globalThis as {
  __chesscomMonths?: Map<string, { at: number; games: ApiGame[] }>;
  __chesscomArchives?: Map<string, { at: number; archives: string[] }>;
};

async function fetchArchiveList(username: string): Promise<string[]> {
  g.__chesscomArchives ??= new Map();
  const hit = g.__chesscomArchives.get(username);
  if (hit && Date.now() - hit.at < CURRENT_MONTH_TTL_MS) return hit.archives;
  const { archives } = await fetchJson<{ archives: string[] }>(
    `${API}/${username}/games/archives`,
  );
  g.__chesscomArchives.set(username, { at: Date.now(), archives });
  return archives;
}

async function fetchMonth(url: string): Promise<ApiGame[]> {
  g.__chesscomMonths ??= new Map();
  const isCurrentMonth = url.endsWith(monthKey(new Date()));
  const hit = g.__chesscomMonths.get(url);
  if (hit && (!isCurrentMonth || Date.now() - hit.at < CURRENT_MONTH_TTL_MS)) {
    return hit.games;
  }
  const { games } = await fetchJson<{ games: ApiGame[] }>(url);
  g.__chesscomMonths.set(url, { at: Date.now(), games });
  return games;
}

/** "0:00:59.9" → 59.9 */
export function clockToSeconds(clock: string): number {
  const parts = clock.split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/**
 * Extracts per-ply clocks from Chess.com PGN comments, in movetext order.
 * Returns undefined when the count doesn't line up with the move list.
 */
export function extractClocks(
  pgn: string,
  plyCount: number,
): number[] | undefined {
  const movetext = pgn.split(/\n\s*\n/).pop() ?? "";
  const clocks = [...movetext.matchAll(/\{\[%clk ([\d:.]+)\]\}/g)].map((m) =>
    clockToSeconds(m[1]),
  );
  return clocks.length === plyCount ? clocks : undefined;
}

/** "60", "60+1", "1/86400" → base seconds. */
export function baseSecondsFromTimeControl(timeControl?: string): number {
  if (!timeControl) return 0;
  const base = timeControl.split("+")[0].split("/").pop() ?? "0";
  return Number(base) || 0;
}

function openingNameFromPgn(headers: Record<string, string | null>): string {
  const ecoUrl = headers["ECOUrl"];
  if (ecoUrl) {
    const slug = ecoUrl.split("/openings/")[1];
    if (slug) {
      // Slugs end in move notation, e.g. "Pirc-Defense-Classical-4...Bg7"
      const words = slug.split("-");
      const cut = words.findIndex((w) => /^\d/.test(w));
      const name = (cut === -1 ? words : words.slice(0, cut)).join(" ").trim();
      if (name) return name;
    }
  }
  return headers["ECO"] ?? "Unknown";
}

function parseGame(raw: ApiGame, username: string): CoachGame | null {
  if (!raw.pgn) return null;

  const lower = username.toLowerCase();
  const userIsWhite = raw.white.username.toLowerCase() === lower;
  const user = userIsWhite ? raw.white : raw.black;
  const opp = userIsWhite ? raw.black : raw.white;

  const chess = new Chess();
  try {
    chess.loadPgn(raw.pgn);
  } catch {
    return null;
  }
  const sans = chess.history();
  if (sans.length < 2) return null;

  const headers = chess.header() as Record<string, string | null>;

  return {
    url: raw.url,
    endTime: raw.end_time,
    timeClass: raw.time_class,
    userColor: userIsWhite ? "w" : "b",
    opponent: opp.username,
    opponentRating: opp.rating,
    userRating: user.rating,
    result: toResult(user.result),
    userResultRaw: user.result,
    openingName: openingNameFromPgn(headers),
    sans,
    clocks: extractClocks(raw.pgn, sans.length),
    baseSeconds: baseSecondsFromTimeControl(raw.time_control),
  };
}

export interface FetchGamesResult {
  games: CoachGame[];
  /** In-range games matching the filter, before the limit was applied. */
  totalInRange: number;
}

export async function fetchGamesSince(
  username: string,
  fromEpoch: number,
  opts: { timeClass?: string; limit?: number } = {},
): Promise<FetchGamesResult> {
  const archives = await fetchArchiveList(username);

  const fromMonth = monthKey(new Date(fromEpoch * 1000));
  const wanted = archives.filter((url) => {
    const key = url.split("/games/")[1];
    return key >= fromMonth;
  });

  const raw: ApiGame[] = [];
  for (const url of wanted) {
    raw.push(...(await fetchMonth(url)));
  }

  // Filter and cap on the cheap raw fields BEFORE the expensive PGN parse.
  const inRange = raw
    .filter(
      (game) =>
        game.end_time >= fromEpoch &&
        game.rules === "chess" &&
        (!opts.timeClass ||
          opts.timeClass === "all" ||
          game.time_class === opts.timeClass),
    )
    .sort((a, b) => b.end_time - a.end_time);

  const toParse = opts.limit ? inRange.slice(0, opts.limit) : inRange;
  const games = toParse
    .map((game) => parseGame(game, username))
    .filter((game): game is CoachGame => game !== null);

  return { games, totalInRange: inRange.length };
}
