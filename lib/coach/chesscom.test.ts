import {
  baseSecondsFromTimeControl,
  clockToSeconds,
  dailyActivity,
  extractClocks,
} from "./chesscom";

describe("clockToSeconds", () => {
  it("parses H:MM:SS", () => {
    expect(clockToSeconds("0:00:59")).toBe(59);
    expect(clockToSeconds("0:01:30")).toBe(90);
    expect(clockToSeconds("1:00:00")).toBe(3600);
  });

  it("parses tenths", () => {
    expect(clockToSeconds("0:00:59.9")).toBeCloseTo(59.9);
  });
});

describe("extractClocks", () => {
  const pgn = [
    '[Event "Live Chess"]',
    '[TimeControl "60"]',
    "",
    "1. e4 {[%clk 0:00:59.9]} c5 {[%clk 0:00:58.2]} 2. Nf3 {[%clk 0:00:59]} d6 {[%clk 0:00:57.1]} 1-0",
  ].join("\n");

  it("extracts one clock per ply in order", () => {
    expect(extractClocks(pgn, 4)).toEqual([59.9, 58.2, 59, 57.1]);
  });

  it("returns undefined on a count mismatch", () => {
    expect(extractClocks(pgn, 6)).toBeUndefined();
  });

  it("returns undefined when there are no clocks", () => {
    expect(extractClocks("1. e4 e5 2. Nf3 Nc6 1-0", 4)).toBeUndefined();
  });
});

describe("dailyActivity", () => {
  // Noon local time on two consecutive days.
  const day1 = Math.floor(new Date(2026, 6, 1, 12).getTime() / 1000);
  const day2 = Math.floor(new Date(2026, 6, 2, 12).getTime() / 1000);
  const game = (end_time: number, userResult: string) => ({
    end_time,
    white: { username: "Me", result: userResult },
    black: { username: "opp", result: "win" },
  });

  it("groups by local day with W-L-D tallies", () => {
    const days = dailyActivity(
      [
        game(day1, "win"),
        game(day1, "checkmated"),
        game(day1, "agreed"),
        game(day2, "win"),
      ],
      "me",
    );
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({
      date: "2026-07-01",
      games: 3,
      wins: 1,
      losses: 1,
      draws: 1,
    });
    expect(days[1]).toMatchObject({ date: "2026-07-02", games: 1, wins: 1 });
  });

  it("files a late-evening game under its local day", () => {
    const lateEvening = Math.floor(new Date(2026, 6, 1, 23).getTime() / 1000);
    const days = dailyActivity([game(lateEvening, "win")], "me");
    expect(days[0].date).toBe("2026-07-01");
  });
});

describe("baseSecondsFromTimeControl", () => {
  it("parses plain seconds", () => {
    expect(baseSecondsFromTimeControl("60")).toBe(60);
    expect(baseSecondsFromTimeControl("180")).toBe(180);
  });

  it("parses increment form", () => {
    expect(baseSecondsFromTimeControl("60+1")).toBe(60);
  });

  it("parses daily form", () => {
    expect(baseSecondsFromTimeControl("1/86400")).toBe(86400);
  });

  it("handles missing values", () => {
    expect(baseSecondsFromTimeControl(undefined)).toBe(0);
  });
});
