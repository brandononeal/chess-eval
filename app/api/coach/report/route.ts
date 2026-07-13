import { analyzeGame, buildReport } from "@/lib/coach/analyze";
import { fetchGamesSince } from "@/lib/coach/chesscom";
import { NativeEngine } from "@/lib/coach/engine";
import { type GameAnalysis } from "@/lib/coach/types";
import {
  clampInt,
  isChessComUsername,
  normalizeTimeClass,
} from "@/lib/coach/validation";
import {
  getOrCreateUserId,
  loadAnalyses,
  loadAnalyzedGames,
  loadDrillHistory,
  loadStudyLog,
  saveAnalysis,
  setReportProgress,
} from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const DEFAULT_DEPTH = 12;
const MAX_GAMES = 50;

interface BuildParams {
  days: number;
  depth: number;
  refresh: boolean;
  timeClass: string;
}

// Two overlapping builds for one user would race on the shared progress row
// and duplicate the Stockfish work. Track in-flight builds per user so an
// identical request shares the result and a conflicting one gets a 409.
// Stored on globalThis to survive dev-mode module reloads.
const g = globalThis as {
  __reportBuilds?: Map<number, { key: string; promise: Promise<object> }>;
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const username = params.get("username") ?? process.env.CHESS_USERNAME;
  if (!username) {
    return NextResponse.json(
      { error: "Set CHESS_USERNAME in .env.local (see .env.example)" },
      { status: 400 },
    );
  }
  if (!isChessComUsername(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }
  const build: BuildParams = {
    days: clampInt(params.get("days"), 1, MAX_DAYS, DEFAULT_DAYS),
    depth: clampInt(params.get("depth"), 1, 20, DEFAULT_DEPTH),
    refresh: params.get("refresh") === "1",
    timeClass: normalizeTimeClass(params.get("tc")),
  };

  try {
    const userId = await getOrCreateUserId(username);
    g.__reportBuilds ??= new Map();
    const key = `${build.days}:${build.depth}:${build.timeClass}:${build.refresh}`;
    const inflight = g.__reportBuilds.get(userId);
    if (inflight) {
      // Same user, same params (two tabs): share the running build instead
      // of spawning a second engine over the same games.
      if (inflight.key === key) return NextResponse.json(await inflight.promise);
      // Different params would corrupt the running build's progress row.
      return NextResponse.json(
        { error: "a report is already being built for this user" },
        { status: 409 },
      );
    }
    const promise = buildReportPayload(username, userId, build);
    g.__reportBuilds.set(userId, { key, promise });
    try {
      return NextResponse.json(await promise);
    } finally {
      g.__reportBuilds.delete(userId);
    }
  } catch (err) {
    // The client's report fetch itself fails here, which stops its progress
    // poll — no need to write a terminal progress row. Raw error messages
    // can leak hosts/SQL — log them, return a generic one.
    console.error("report route failed:", err);
    return NextResponse.json(
      { error: "failed to build report" },
      { status: 502 },
    );
  }
}

async function buildReportPayload(
  username: string,
  userId: number,
  { days, depth, refresh, timeClass }: BuildParams,
): Promise<object> {
  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - days * 86_400;

  await setReportProgress(userId, { phase: "fetching", current: 0, total: 0 });
  const { games: toAnalyze, totalInRange } = await fetchGamesSince(
    username,
    fromTime,
    { timeClass, limit: MAX_GAMES },
  );
  const skippedGames = totalInRange - toAnalyze.length;

  // Shared cache: pull what's already analyzed, run Stockfish on the rest.
  const cached = refresh
    ? {}
    : await loadAnalyses(
        toAnalyze.map((g) => g.url),
        depth,
      );
  const missing = toAnalyze.filter((g) => !cached[g.url]);

  if (missing.length > 0) {
    await setReportProgress(userId, {
      phase: "analyzing",
      current: 0,
      total: missing.length,
    });
    const engine = new NativeEngine();
    await engine.init();
    try {
      for (let i = 0; i < missing.length; i++) {
        const analysis = await analyzeGame(missing[i], engine, depth);
        await saveAnalysis(missing[i].url, depth, analysis);
        cached[missing[i].url] = analysis;
        await setReportProgress(userId, { current: i + 1 });
      }
    } finally {
      engine.quit();
    }
  }

  const analyses: GameAnalysis[] = toAnalyze.map((g) => cached[g.url]);
  const [drillHistory, analyzedGames, studyLog] = await Promise.all([
    loadDrillHistory(userId),
    loadAnalyzedGames(userId),
    loadStudyLog(userId),
  ]);
  await setReportProgress(userId, { phase: "done" });
  const report = buildReport(
    username,
    fromTime,
    now,
    analyses,
    skippedGames,
    drillHistory,
    timeClass,
    analyzedGames,
    studyLog,
  );
  // Per-ply clocks and per-game buckets are analysis inputs the client
  // never reads — stripping them cuts ~15% off the response.
  return {
    ...report,
    games: report.games.map((a) => ({
      ...a,
      game: { ...a.game, clocks: undefined },
      clockBuckets: undefined,
    })),
  };
}
