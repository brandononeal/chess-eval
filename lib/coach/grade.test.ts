import { computeGrade, nextLevelPlan } from "./grade";
import type { GameAnalysis, WeeklyReport } from "./types";

function makeReport(overrides: {
  acpls: number[];
  blunders?: number[];
  wins?: number;
  losses?: number;
  lostOnTimeWhileWinning?: number;
  rushedRate?: { calm: number; rushed: number };
}): WeeklyReport {
  const games = overrides.acpls.map(
    (acpl, i) =>
      ({
        acpl,
        counts: {
          blunder: overrides.blunders?.[i] ?? 1,
          mistake: 0,
          inaccuracy: 0,
        },
        game: { result: "win" },
      }) as unknown as GameAnalysis,
  );
  const wins = overrides.wins ?? Math.ceil(games.length / 2);
  const losses = overrides.losses ?? games.length - wins;
  return {
    games,
    totals: { games: games.length, wins, losses, draws: 0 },
    timePressure: {
      hasClockData: !!overrides.rushedRate,
      lostOnTime: overrides.lostOnTimeWhileWinning ?? 0,
      lostOnTimeWhileWinning: overrides.lostOnTimeWhileWinning ?? 0,
      buckets: {
        over30: {
          moves: 1000,
          blunders: Math.round((overrides.rushedRate?.calm ?? 0.1) * 1000),
          mistakes: 0,
        },
        s10to30: {
          moves: 100,
          blunders: Math.round((overrides.rushedRate?.rushed ?? 0.1) * 100),
          mistakes: 0,
        },
        under10: { moves: 0, blunders: 0, mistakes: 0 },
      },
    },
    daily: [],
    openings: [],
  } as unknown as WeeklyReport;
}

describe("computeGrade", () => {
  it("returns null with no games", () => {
    expect(computeGrade(makeReport({ acpls: [] }))).toBeNull();
  });

  it("grades low ACPL and clean play highly", () => {
    const grade = computeGrade(
      makeReport({ acpls: [30, 35, 40], blunders: [0, 0, 1], wins: 3 }),
    );
    expect(grade?.letter).toMatch(/^A/);
  });

  it("grades high ACPL with many blunders poorly", () => {
    const grade = computeGrade(
      makeReport({
        acpls: [120, 130, 110],
        blunders: [3, 4, 3],
        wins: 0,
        losses: 3,
      }),
    );
    expect(["D", "F"]).toContain(grade?.letter);
  });

  it("prioritizes flagged-while-winning in the note", () => {
    const grade = computeGrade(
      makeReport({ acpls: [60, 70], lostOnTimeWhileWinning: 2 }),
    );
    expect(grade?.note).toContain("on the clock");
  });

  it("mentions time pressure when the rushed error rate doubles", () => {
    const grade = computeGrade(
      makeReport({ acpls: [60, 70], rushedRate: { calm: 0.1, rushed: 0.25 } }),
    );
    expect(grade?.note).toContain("under 30 seconds");
  });

  it("always produces a note", () => {
    const grade = computeGrade(makeReport({ acpls: [65] }));
    expect(grade?.note.length).toBeGreaterThan(10);
  });

  it("exposes the math behind the letter", () => {
    const grade = computeGrade(
      makeReport({ acpls: [70, 70], blunders: [0, 0], wins: 2 }),
    );
    // ACPL 70 → 2.7 base; 0 blunders/game → +0.3; 100% score → +0.3.
    expect(grade?.breakdown).toMatchObject({
      avgAcpl: 70,
      acplGpa: 2.7,
      blunderMod: 0.3,
      scoreMod: 0.3,
      gpa: 3.3,
    });
    expect(grade?.letter).toBe("B+");
  });

  it("flags a rating climb that outruns move quality", () => {
    const report = makeReport({
      acpls: [90, 95],
      blunders: [2, 3],
      wins: 2,
    });
    report.ratingSeries = [
      { t: 1, rating: 700 },
      { t: 2, rating: 758 },
    ] as WeeklyReport["ratingSeries"];
    report.ratingSeriesClass = "blitz";
    const grade = computeGrade(report);
    expect(grade?.rating?.delta).toBe(58);
    expect(grade?.rating?.timeClass).toBe("blitz");
    expect(grade?.rating?.note).toContain("outrunning");
  });

  it("stays quiet when rating and grade agree", () => {
    const report = makeReport({ acpls: [35, 40], blunders: [0, 0], wins: 2 });
    report.ratingSeries = [
      { t: 1, rating: 700 },
      { t: 2, rating: 750 },
    ] as WeeklyReport["ratingSeries"];
    const grade = computeGrade(report);
    expect(grade?.rating?.delta).toBe(50);
    expect(grade?.rating?.note).toBeNull();
  });

  it("omits the rating trend without series data", () => {
    expect(computeGrade(makeReport({ acpls: [65] }))?.rating).toBeNull();
  });
});

describe("nextLevelPlan", () => {
  function withRating(report: WeeklyReport, rating: number): WeeklyReport {
    return {
      ...report,
      ratingSeries: [
        { t: 1, rating: rating - 20 },
        { t: 2, rating },
      ],
    };
  }

  it("returns null without rating data", () => {
    const report = makeReport({ acpls: [60] });
    report.ratingSeries = [];
    expect(nextLevelPlan(report)).toBeNull();
  });

  it("targets the next century mark", () => {
    const plan = nextLevelPlan(withRating(makeReport({ acpls: [60] }), 746));
    expect(plan?.target).toBe(800);
    expect(nextLevelPlan(withRating(makeReport({ acpls: [60] }), 800))?.target).toBe(900);
  });

  it("leads with time pressure when the rushed error rate spikes", () => {
    const report = withRating(
      makeReport({ acpls: [60, 70], rushedRate: { calm: 0.1, rushed: 0.25 } }),
      750,
    );
    const plan = nextLevelPlan(report);
    expect(plan?.tips[0]).toContain("under 30 seconds");
  });

  it("caps at three tips and always returns at least one", () => {
    const plan = nextLevelPlan(withRating(makeReport({ acpls: [40], blunders: [0] }), 750));
    expect(plan?.tips.length).toBeGreaterThanOrEqual(1);
    expect(plan?.tips.length).toBeLessThanOrEqual(3);
  });
});
