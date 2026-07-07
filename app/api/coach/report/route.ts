import { analyzeGame, buildReport } from "@/lib/coach/analyze";
import { fetchGamesSince } from "@/lib/coach/chesscom";
import { NativeEngine } from "@/lib/coach/engine";
import { setProgress } from "@/lib/coach/progress";
import {
  cacheKey,
  loadAnalysisCache,
  loadDrillHistory,
  saveAnalysisCache,
} from "@/lib/coach/storage";
import { TIME_CLASSES, type GameAnalysis } from "@/lib/coach/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const DEFAULT_DEPTH = 12;
const MAX_GAMES = 50;
const TIME_CLASS_SET = new Set<string>(TIME_CLASSES);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const username = params.get("username") ?? process.env.CHESS_USERNAME;
  if (!username) {
    return NextResponse.json(
      { error: "Set CHESS_USERNAME in .env.local (see .env.example)" },
      { status: 400 },
    );
  }
  const days = Math.min(
    MAX_DAYS,
    Math.max(1, Number(params.get("days")) || DEFAULT_DAYS),
  );
  const depth = Math.min(20, Number(params.get("depth")) || DEFAULT_DEPTH);
  const refresh = params.get("refresh") === "1";
  const tcParam = params.get("tc") ?? "all";
  const timeClass = TIME_CLASS_SET.has(tcParam) ? tcParam : "all";

  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - days * 86_400;

  try {
    setProgress({ phase: "fetching", current: 0, total: 0 });
    const { games: toAnalyze, totalInRange } = await fetchGamesSince(
      username,
      fromTime,
      { timeClass, limit: MAX_GAMES },
    );
    const skippedGames = totalInRange - toAnalyze.length;

    const cache = await loadAnalysisCache();
    if (refresh) {
      // Invalidate only the games this request covers — never the whole file.
      for (const g of toAnalyze) delete cache[cacheKey(g.url, depth)];
    }
    const analyses: GameAnalysis[] = [];
    const missing = toAnalyze.filter((g) => !cache[cacheKey(g.url, depth)]);

    if (missing.length > 0) {
      setProgress({ phase: "analyzing", current: 0, total: missing.length });
      const engine = new NativeEngine();
      await engine.init();
      try {
        for (let i = 0; i < missing.length; i++) {
          cache[cacheKey(missing[i].url, depth)] = await analyzeGame(
            missing[i],
            engine,
            depth,
          );
          setProgress({ current: i + 1 });
        }
      } finally {
        engine.quit();
      }
      // Merge with what's on disk so a concurrent request's entries survive.
      const disk = await loadAnalysisCache();
      await saveAnalysisCache({ ...disk, ...cache });
    }

    for (const game of toAnalyze) {
      analyses.push(cache[cacheKey(game.url, depth)]);
    }

    const drillHistory = await loadDrillHistory();
    setProgress({ phase: "done" });
    const report = buildReport(
      username,
      fromTime,
      now,
      analyses,
      skippedGames,
      drillHistory,
      timeClass,
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
    setProgress({ phase: "done" });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
