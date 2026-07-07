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
  rated: boolean;
  time_class: string;
  time_control?: string;
  rules: string;
  white: ApiPlayer;
  black: ApiPlayer;
  eco?: string;
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

function parseGame(raw: ApiGame, username: string): CoachGame | null {
  if (raw.rules !== "chess" || !raw.pgn) return null;

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
    rated: raw.rated,
    userColor: userIsWhite ? "w" : "b",
    opponent: opp.username,
    opponentRating: opp.rating,
    userRating: user.rating,
    result: toResult(user.result),
    userResultRaw: user.result,
    eco: headers["ECO"] ?? "",
    openingName: openingNameFromPgn(headers),
    sans,
    clocks: extractClocks(raw.pgn, sans.length),
    baseSeconds: baseSecondsFromTimeControl(raw.time_control),
  };
}

export async function fetchGamesSince(
  username: string,
  fromEpoch: number,
): Promise<CoachGame[]> {
  const { archives } = await fetchJson<{ archives: string[] }>(
    `${API}/${username}/games/archives`,
  );

  const fromMonth = monthKey(new Date(fromEpoch * 1000));
  const wanted = archives.filter((url) => {
    const key = url.split("/games/")[1];
    return key >= fromMonth;
  });

  const games: CoachGame[] = [];
  for (const url of wanted) {
    const { games: monthGames } = await fetchJson<{ games: ApiGame[] }>(url);
    for (const raw of monthGames) {
      if (raw.end_time < fromEpoch) continue;
      const parsed = parseGame(raw, username);
      if (parsed) games.push(parsed);
    }
  }

  return games.sort((a, b) => b.endTime - a.endTime);
}
