/**
 * @jest-environment node
 *
 * Integration tests for lib/db/queries.ts against the dedicated test
 * database (see lib/db/test-url.ts). The default jest environment is jsdom;
 * DB tests need node (postgres-js uses net sockets), hence the docblock.
 */
import { eq, sql } from "drizzle-orm";
import type { Drill, GameAnalysis } from "@/lib/coach/types";
import { db } from "./index";
import {
  getOrCreateUserId,
  getUserId,
  loadAnalyses,
  loadDrillHistory,
  saveAnalysis,
  upsertDrillRecord,
} from "./queries";
import { drillHistory, gameAnalyses, users } from "./schema";

// Must match CACHE_VERSION in queries.ts only for the *wrong-version* seed —
// we deliberately use an impossible version so the test never accidentally
// collides with the real one.
const WRONG_CACHE_VERSION = -1;

function makeAnalysis(url: string): GameAnalysis {
  return {
    game: {
      url,
      endTime: 1_700_000_000,
      timeClass: "blitz",
      userColor: "w",
      opponent: "rival",
      opponentRating: 1512,
      userRating: 1487,
      result: "loss",
      userResultRaw: "checkmated",
      openingName: "Italian Game",
      sans: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"],
      baseSeconds: 300,
    },
    issues: [
      {
        ply: 5,
        moveNumber: 3,
        san: "Bc4",
        severity: "mistake",
        evalBefore: 30,
        evalAfter: -80,
        swing: 110,
        fenBefore:
          "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        bestMoveSan: "Bb5",
        clockSeconds: 250,
        phase: "opening",
      },
    ],
    counts: { inaccuracy: 0, mistake: 1, blunder: 0 },
    acpl: 42,
    repertoire: { inRepertoire: true, note: "Italian Game" },
    clockBuckets: {
      over30: { moves: 20, blunders: 0, mistakes: 1 },
      s10to30: { moves: 5, blunders: 0, mistakes: 0 },
      under10: { moves: 2, blunders: 1, mistakes: 0 },
    },
    phaseTallies: {
      opening: { moves: 10, blunders: 0, mistakes: 1 },
      middlegame: { moves: 12, blunders: 1, mistakes: 0 },
      endgame: { moves: 5, blunders: 0, mistakes: 0 },
    },
    lostOnTime: false,
    lostOnTimeWhileWinning: false,
    evals: [20, 25, 30, -80, -60, -100],
  };
}

function makeDrill(id: string): Drill {
  return {
    id,
    gameUrl: "https://www.chess.com/game/live/123",
    opponent: "rival",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    userColor: "w",
    playedSan: "Bc4",
    bestMoveSan: "Bb5",
    swing: 110,
    evalBefore: 30,
    moveNumber: 3,
  };
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table users, game_analyses, drill_history, analyzed_games, study_log, report_progress restart identity cascade`,
  );
});

afterAll(async () => {
  await db.$client.end();
});

describe("saveAnalysis / loadAnalyses", () => {
  it("round-trips a realistic GameAnalysis", async () => {
    const url = "https://www.chess.com/game/live/roundtrip";
    const analysis = makeAnalysis(url);
    await saveAnalysis(url, 12, analysis);

    const loaded = await loadAnalyses([url], 12);
    expect(loaded[url]).toEqual(analysis);
  });

  it("filters on both depth and cacheVersion", async () => {
    const good = "https://www.chess.com/game/live/good";
    const wrongDepth = "https://www.chess.com/game/live/wrong-depth";
    const wrongVersion = "https://www.chess.com/game/live/wrong-version";

    // Correct pair: saveAnalysis stamps the current CACHE_VERSION.
    await saveAnalysis(good, 12, makeAnalysis(good));
    // Wrong depth, correct version.
    await saveAnalysis(wrongDepth, 8, makeAnalysis(wrongDepth));
    // Correct depth, wrong cache version (seeded directly, bypassing the
    // CACHE_VERSION stamp).
    await db.insert(gameAnalyses).values({
      url: wrongVersion,
      depth: 12,
      cacheVersion: WRONG_CACHE_VERSION,
      analysis: makeAnalysis(wrongVersion),
    });

    const loaded = await loadAnalyses([good, wrongDepth, wrongVersion], 12);
    expect(Object.keys(loaded)).toEqual([good]);
  });

  it("returns {} for an empty url list without touching the db", async () => {
    await expect(loadAnalyses([], 12)).resolves.toEqual({});
  });
});

describe("getOrCreateUserId", () => {
  it("normalizes usernames to lowercase", async () => {
    const id = await getOrCreateUserId("MagnusCarlsen");
    const rows = await db.select().from(users).where(eq(users.id, id));
    expect(rows[0].chesscomUsername).toBe("magnuscarlsen");
    // Lookups in any casing resolve to the same row.
    await expect(getUserId("MAGNUSCARLSEN")).resolves.toBe(id);
  });

  it("returns the existing row on repeat calls", async () => {
    const first = await getOrCreateUserId("hikaru");
    const second = await getOrCreateUserId("Hikaru");
    expect(second).toBe(first);
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
  });

  it("survives the insert race: 5 concurrent calls yield one row, same id", async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => getOrCreateUserId("racer")),
    );
    expect(new Set(ids).size).toBe(1);
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(ids[0]);
  });

  it("falls back to re-select when the insert loses the race (pre-inserted row)", async () => {
    // Simulate another writer winning between our calls: the row already
    // exists, so onConflictDoNothing returns nothing and the id must still
    // come back.
    await db.insert(users).values({ chesscomUsername: "winner" });
    const [{ id: existingId }] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.chesscomUsername, "winner"));
    await expect(getOrCreateUserId("Winner")).resolves.toBe(existingId);
  });
});

describe("upsertDrillRecord", () => {
  it("increments fails across sequential failed attempts", async () => {
    const userId = await getOrCreateUserId("driller");
    const drill = makeDrill("seq-fails");
    await upsertDrillRecord(userId, drill, false, 1_700_000_000);
    await upsertDrillRecord(userId, drill, false, 1_700_000_100);

    const history = await loadDrillHistory(userId);
    expect(history["seq-fails"].fails).toBe(2);
    expect(history["seq-fails"].passed).toBe(false);
    expect(history["seq-fails"].updatedAt).toBe(1_700_000_100);
  });

  it("preserves fails when a pass follows failures", async () => {
    const userId = await getOrCreateUserId("driller");
    const drill = makeDrill("pass-after-fails");
    await upsertDrillRecord(userId, drill, false, 1_700_000_000);
    await upsertDrillRecord(userId, drill, false, 1_700_000_100);
    await upsertDrillRecord(userId, drill, true, 1_700_000_200);

    const history = await loadDrillHistory(userId);
    expect(history["pass-after-fails"].fails).toBe(2);
    expect(history["pass-after-fails"].passed).toBe(true);
  });

  it("counts every failure under concurrency (atomic SQL increment)", async () => {
    const userId = await getOrCreateUserId("driller");
    const drill = makeDrill("concurrent-fails");
    await Promise.all(
      Array.from({ length: 3 }, () =>
        upsertDrillRecord(userId, drill, false, 1_700_000_000),
      ),
    );

    const rows = await db
      .select()
      .from(drillHistory)
      .where(eq(drillHistory.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].fails).toBe(3);
  });
});
