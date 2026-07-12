import { analyzeGame, buildReport } from "@/lib/coach/analyze";
import { fetchGamesSince } from "@/lib/coach/chesscom";
import { NativeEngine } from "@/lib/coach/engine";
import { type GameAnalysis } from "@/lib/coach/types";
import { clampInt, normalizeTimeClass } from "@/lib/coach/validation";
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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const username = params.get("username") ?? process.env.CHESS_USERNAME;
  if (!username) {
    return NextResponse.json(
      { error: "Set CHESS_USERNAME in .env.local (see .env.example)" },
      { status: 400 },
    );
  }
  const days = clampInt(params.get("days"), 1, MAX_DAYS, DEFAULT_DAYS);
  const depth = clampInt(params.get("depth"), 1, 20, DEFAULT_DEPTH);
  const refresh = params.get("refresh") === "1";
  const timeClass = normalizeTimeClass(params.get("tc"));

  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - days * 86_400;

  try {
    const userId = await getOrCreateUserId(username);
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
    return NextResponse.json({
      ...report,
      games: report.games.map((a) => ({
        ...a,
        game: { ...a.game, clocks: undefined },
        clockBuckets: undefined,
      })),
    });
  } catch (err) {
    // The client's report fetch itself fails here, which stops its progress
    // poll — no need to write a terminal progress row.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
