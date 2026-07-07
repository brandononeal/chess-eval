import {
  baseSecondsFromTimeControl,
  clockToSeconds,
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
