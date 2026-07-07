import { bucketFor, buildReport } from "./analyze";
import type { GameAnalysis } from "./types";

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
      repertoire: { expected: null, inRepertoire: null, note: "" },
      lostOnTime: false,
      lostOnTimeWhileWinning: false,
      evals: [],
    }) as unknown as GameAnalysis;

  it("charts only the dominant time class, never mixed rating scales", () => {
    const report = buildReport("u", 7, 0, 100, [
      analysis("bullet", 740, 1),
      analysis("bullet", 750, 2),
      analysis("rapid", 950, 3),
    ], 0);
    expect(report.ratingSeriesClass).toBe("bullet");
    expect(report.ratingSeries.map((p) => p.rating)).toEqual([740, 750]);
  });

  it("handles an empty report", () => {
    const report = buildReport("u", 7, 0, 100, [], 0);
    expect(report.ratingSeriesClass).toBeNull();
    expect(report.ratingSeries).toEqual([]);
  });

  it("records the applied filter", () => {
    const report = buildReport("u", 7, 0, 100, [analysis("blitz", 900, 1)], 0, {}, "blitz");
    expect(report.timeClassFilter).toBe("blitz");
  });
});
