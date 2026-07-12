import {
  bucketFor,
  buildPhaseSummary,
  buildReport,
  phaseFor,
} from "./analyze";
import type { BucketTally, GameAnalysis, GamePhase } from "./types";

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
