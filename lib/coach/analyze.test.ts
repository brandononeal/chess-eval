import {
  analyzeGame,
  bucketFor,
  buildPhaseSummary,
  buildReport,
  phaseFor,
} from "./analyze";
import type { NativeEngine } from "./engine";
import type {
  BucketTally,
  CoachGame,
  DrillRecord,
  GameAnalysis,
  GamePhase,
  MoveIssue,
} from "./types";

describe("bucketFor", () => {
  it("buckets clock times", () => {
    expect(bucketFor(59)).toBe("over30");
    expect(bucketFor(31)).toBe("over30");
    expect(bucketFor(30)).toBe("s10to30");
    expect(bucketFor(10)).toBe("s10to30");
    expect(bucketFor(9.9)).toBe("under10");
    expect(bucketFor(0)).toBe("under10");
  });
});

describe("phaseFor", () => {
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const KP_ENDING = "8/5k2/8/8/4P3/4K3/8/8 w - - 0 30";

  it("classifies early full-board moves as opening", () => {
    expect(phaseFor(5, START)).toBe("opening");
  });

  it("classifies late full-board moves as middlegame", () => {
    expect(phaseFor(30, START)).toBe("middlegame");
  });

  it("classifies few-piece positions as endgame regardless of ply", () => {
    expect(phaseFor(14, KP_ENDING)).toBe("endgame");
    expect(phaseFor(80, KP_ENDING)).toBe("endgame");
  });
});

describe("buildPhaseSummary", () => {
  const withTallies = (
    tallies: Record<GamePhase, BucketTally>,
  ): GameAnalysis => ({ phaseTallies: tallies }) as unknown as GameAnalysis;

  it("recommends the specialization for the worst phase", () => {
    const summary = buildPhaseSummary([
      withTallies({
        opening: { moves: 100, blunders: 2, mistakes: 3 }, // 5%
        middlegame: { moves: 200, blunders: 10, mistakes: 10 }, // 10%
        endgame: { moves: 60, blunders: 10, mistakes: 5 }, // 25%
      }),
    ]);
    expect(summary.recommendation?.focus).toBe("Endgames");
    expect(summary.recommendation?.reason).toContain("endgame");
  });

  it("ignores phases with too few moves", () => {
    const summary = buildPhaseSummary([
      withTallies({
        opening: { moves: 100, blunders: 5, mistakes: 5 }, // 10%
        middlegame: { moves: 100, blunders: 2, mistakes: 2 }, // 4%
        endgame: { moves: 4, blunders: 4, mistakes: 0 }, // 100% but tiny sample
      }),
    ]);
    expect(summary.recommendation?.focus).toBe("Openings");
  });

  it("returns null with no data", () => {
    expect(buildPhaseSummary([]).recommendation).toBeNull();
  });
});

describe("analyzeGame", () => {
  const coachGame = (overrides: Partial<CoachGame>): CoachGame => ({
    url: "game-1",
    endTime: 1,
    timeClass: "blitz",
    userColor: "w",
    opponent: "opp",
    opponentRating: 800,
    userRating: 800,
    result: "loss",
    userResultRaw: "checkmated",
    openingName: "Test Opening",
    sans: [],
    baseSeconds: 300,
    ...overrides,
  });

  /** Engine whose evaluate() replays the given White-POV evals in order. */
  const stubEngine = (evals: number[]): NativeEngine => {
    let call = 0;
    return {
      evaluate: async () => ({ cp: evals[call++], bestMoveUci: "" }),
    } as unknown as NativeEngine;
  };

  it("computes Black losses as evalAfter - evalBefore", async () => {
    // White POV eval jumps from 0 to +350 after Black's move: Black lost 350.
    const game = coachGame({ userColor: "b", sans: ["e4", "e5"] });
    const analysis = await analyzeGame(game, stubEngine([0, 0, 350]), 1);

    expect(analysis.acpl).toBe(350);
    expect(analysis.counts.blunder).toBe(1);
    expect(analysis.issues).toHaveLength(1);
    expect(analysis.issues[0]).toMatchObject({
      ply: 2,
      san: "e5",
      severity: "blunder",
      evalBefore: 0,
      evalAfter: 350,
      swing: 350,
    });
  });

  it("skips issues and tallies in decided positions but keeps ACPL", async () => {
    const game = coachGame({ sans: ["e4"] });
    const analysis = await analyzeGame(game, stubEngine([900, 200]), 1);

    expect(analysis.issues).toEqual([]);
    expect(analysis.counts).toEqual({ inaccuracy: 0, mistake: 0, blunder: 0 });
    expect(analysis.phaseTallies.opening.moves).toBe(0);
    expect(analysis.acpl).toBe(700); // the 700cp loss still counts toward ACPL
  });

  it("reads the clock entering a move from the previous own move", async () => {
    const game = coachGame({
      sans: ["e4", "e5", "Nf3"],
      clocks: [25, 8, 40],
      baseSeconds: 300,
    });
    const analysis = await analyzeGame(
      game,
      stubEngine([0, -300, 0, -300]),
      1,
    );

    // First move falls back to base time; ply 2 reads clocks[0].
    expect(analysis.issues.map((i) => i.clockSeconds)).toEqual([300, 25]);
    expect(analysis.clockBuckets?.over30.moves).toBe(1);
    expect(analysis.clockBuckets?.s10to30.moves).toBe(1);
    expect(analysis.clockBuckets?.under10.moves).toBe(0);
  });
});

describe("buildDrills (via buildReport)", () => {
  const issue = (
    ply: number,
    swing: number,
    overrides: Partial<MoveIssue> = {},
  ): MoveIssue => ({
    ply,
    moveNumber: Math.ceil(ply / 2),
    san: "Qh5",
    severity: "blunder",
    evalBefore: 0,
    evalAfter: -swing,
    swing,
    fenBefore: "fen",
    bestMoveSan: "Nf3",
    phase: "middlegame",
    ...overrides,
  });

  const withIssues = (url: string, issues: MoveIssue[]): GameAnalysis =>
    ({
      game: {
        url,
        timeClass: "blitz",
        userRating: 800,
        endTime: 1,
        result: "loss",
        userColor: "w",
        opponent: "opp",
        opponentRating: 800,
        openingName: "Test Opening",
        sans: [],
      },
      issues,
      counts: { inaccuracy: 0, mistake: 0, blunder: 0 },
      acpl: 50,
      repertoire: { inRepertoire: null, note: "" },
      lostOnTime: false,
      lostOnTimeWhileWinning: false,
      evals: [],
    }) as unknown as GameAnalysis;

  const record = (
    id: string,
    passed: boolean,
    fails: number,
    updatedAt = 1,
  ): DrillRecord => ({
    drill: {
      id,
      gameUrl: "old-game",
      opponent: "opp",
      fen: "fen",
      userColor: "w",
      playedSan: "Qh5",
      bestMoveSan: "Nf3",
      swing: 100,
      evalBefore: 0,
      moveNumber: 1,
    },
    passed,
    fails,
    updatedAt,
  });

  const drills = (
    analyses: GameAnalysis[],
    history: Record<string, DrillRecord> = {},
  ) => buildReport("u", 0, 100, analyses, 0, history).drills;

  it("excludes already-passed drills from fresh", () => {
    const result = drills(
      [withIssues("g1", [issue(3, 300), issue(5, 400)])],
      { "g1#3": record("g1#3", true, 2) },
    );
    expect(result.map((d) => d.id)).toEqual(["g1#5"]);
  });

  it("resurfaces failed history drills without duplicating fresh ones", () => {
    const result = drills([withIssues("g1", [issue(3, 300)])], {
      "old#1": record("old#1", false, 2),
      "old#2": record("old#2", false, 0), // never failed: not a review
      "old#3": record("old#3", true, 3), // passed: not a review
      "g1#3": record("g1#3", false, 1), // already fresh: not duplicated
    });
    expect(result.map((d) => d.id)).toEqual(["old#1", "g1#3"]);
    expect(result[0].isReview).toBe(true);
    expect(result[1].isReview).toBeUndefined();
  });

  it("sorts fresh by swing desc, caps at 6, and prepends up to 2 reviews", () => {
    const issues = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      issue(n, n * 100),
    );
    const result = drills([withIssues("g1", issues)], {
      "old#1": record("old#1", false, 1),
      "old#2": record("old#2", false, 3),
      "old#3": record("old#3", false, 2),
    });
    expect(result.map((d) => d.id)).toEqual([
      "old#2", // most fails first
      "old#3",
      "g1#8", // then fresh, biggest swing first
      "g1#7",
      "g1#6",
      "g1#5",
      "g1#4",
      "g1#3",
    ]);
  });

  it("drops inaccuracies and issues without a best move", () => {
    const result = drills([
      withIssues("g1", [
        issue(1, 100, { severity: "inaccuracy" }),
        issue(3, 300, { bestMoveSan: "" }),
        issue(5, 200, { severity: "mistake" }),
      ]),
    ]);
    expect(result.map((d) => d.id)).toEqual(["g1#5"]);
  });
});

describe("buildOpenings (via buildReport)", () => {
  const analysis = (
    openingName: string,
    inRepertoire: boolean | null,
    url: string,
  ): GameAnalysis =>
    ({
      game: {
        url,
        timeClass: "blitz",
        userRating: 800,
        endTime: 1,
        result: "win",
        userColor: "b",
        opponent: "opp",
        opponentRating: 800,
        openingName,
        sans: [],
      },
      issues: [],
      counts: { inaccuracy: 0, mistake: 0, blunder: 0 },
      acpl: 50,
      repertoire: { inRepertoire, note: "" },
      lostOnTime: false,
      lostOnTimeWhileWinning: false,
      evals: [],
    }) as unknown as GameAnalysis;

  it("merges variations into one family; any in-repertoire game wins", () => {
    const openings = buildReport("u", 0, 100, [
      analysis("Sicilian Defense Najdorf", true, "g1"),
      analysis("Sicilian Defense Alapin", false, "g2"),
    ], 0).openings;
    expect(openings).toHaveLength(1);
    expect(openings[0].name).toBe("Sicilian Defense");
    expect(openings[0].games).toBe(2);
    expect(openings[0].inRepertoire).toBe(true);
  });

  it("lets a deviation overwrite null but not true", () => {
    const openings = buildReport("u", 0, 100, [
      analysis("Sicilian Defense Najdorf", null, "g1"),
      analysis("Sicilian Defense Alapin", false, "g2"),
    ], 0).openings;
    expect(openings[0].inRepertoire).toBe(false);
  });

  it("truncates marker-less names to three words without choking on short ones", () => {
    const openings = buildReport("u", 0, 100, [
      analysis("Reti Zukertort Symmetrical Variation Line", null, "g1"),
      analysis("Unknown", null, "g2"),
    ], 0).openings;
    expect(openings.map((o) => o.name).sort()).toEqual([
      "Reti Zukertort Symmetrical",
      "Unknown",
    ]);
  });
});

describe("buildReport rating series", () => {
  const analysis = (
    timeClass: string,
    rating: number,
    endTime: number,
  ): GameAnalysis =>
    ({
      game: {
        url: `game-${timeClass}-${endTime}`,
        timeClass,
        userRating: rating,
        endTime,
        result: "win",
        userColor: "w",
        opponent: "x",
        opponentRating: 800,
        openingName: "Test Opening",
        sans: [],
      },
      issues: [],
      counts: { inaccuracy: 0, mistake: 0, blunder: 0 },
      acpl: 50,
      repertoire: { inRepertoire: null, note: "" },
      lostOnTime: false,
      lostOnTimeWhileWinning: false,
      evals: [],
    }) as unknown as GameAnalysis;

  it("charts only the dominant time class, never mixed rating scales", () => {
    const report = buildReport("u", 0, 100, [
      analysis("bullet", 740, 1),
      analysis("bullet", 750, 2),
      analysis("rapid", 950, 3),
    ], 0);
    expect(report.ratingSeriesClass).toBe("bullet");
    expect(report.ratingSeries.map((p) => p.rating)).toEqual([740, 750]);
  });

  it("handles an empty report", () => {
    const report = buildReport("u", 0, 100, [], 0);
    expect(report.ratingSeriesClass).toBeNull();
    expect(report.ratingSeries).toEqual([]);
  });

  it("records the applied filter", () => {
    const report = buildReport("u", 0, 100, [analysis("blitz", 900, 1)], 0, {}, "blitz");
    expect(report.timeClassFilter).toBe("blitz");
  });
});
