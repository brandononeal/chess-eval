import type { Score } from "@/lib/stockfish";
function scoreToPercentage(score: Score): number {
  if (score.type === "mate") {
    const absValue = Math.abs(score.value);
    const isCheckmate = absValue >= 100;
    return score.value > 0 ? (isCheckmate ? 100 : 95) : isCheckmate ? 0 : 5;
  }
  return Math.max(0, Math.min(100, 50 + (score.value / 100) * 5));
}

function scoreToLabel(score: Score): string {
  if (score.type === "mate") {
    const v = score.value;
    const absValue = Math.abs(v);
    if (absValue >= 100) return "✓";
    if (v > 0) return `M${v}`;
    if (v < 0) return `M${absValue}`;
    return "0.00";
  }
  const pawns = Math.abs(score.value / 100);
  if (pawns === 0) return "=";
  return pawns.toFixed(1);
}

describe("scoreToPercentage", () => {
  it("returns 50 for equal position (0 cp)", () => {
    expect(scoreToPercentage({ type: "cp", value: 0 })).toBe(50);
  });

  it("increases for white advantage", () => {
    const pct = scoreToPercentage({ type: "cp", value: 200 });
    expect(pct).toBeGreaterThan(50);
  });

  it("decreases for black advantage", () => {
    const pct = scoreToPercentage({ type: "cp", value: -200 });
    expect(pct).toBeLessThan(50);
  });

  it("clamps to 100 max", () => {
    const pct = scoreToPercentage({ type: "cp", value: 5000 });
    expect(pct).toBe(100);
  });

  it("clamps to 0 min", () => {
    const pct = scoreToPercentage({ type: "cp", value: -5000 });
    expect(pct).toBe(0);
  });

  it("returns 95 for mate in favor of white (< 100)", () => {
    expect(scoreToPercentage({ type: "mate", value: 3 })).toBe(95);
  });

  it("returns 5 for mate in favor of black (< 100)", () => {
    expect(scoreToPercentage({ type: "mate", value: -3 })).toBe(5);
  });

  it("returns 100 for checkmate (mate value >= 100)", () => {
    expect(scoreToPercentage({ type: "mate", value: 1000 })).toBe(100);
  });

  it("returns 0 for checkmate against white (mate value <= -100)", () => {
    expect(scoreToPercentage({ type: "mate", value: -1000 })).toBe(0);
  });
});

describe("scoreToLabel", () => {
  it("returns '=' for exactly 0 cp", () => {
    expect(scoreToLabel({ type: "cp", value: 0 })).toBe("=");
  });

  it("returns pawn value for centipawns", () => {
    expect(scoreToLabel({ type: "cp", value: 150 })).toBe("1.5");
  });

  it("returns absolute pawn value for negative centipawns", () => {
    expect(scoreToLabel({ type: "cp", value: -300 })).toBe("3.0");
  });

  it("returns M notation for mate in N", () => {
    expect(scoreToLabel({ type: "mate", value: 5 })).toBe("M5");
  });

  it("returns M notation for mate against", () => {
    expect(scoreToLabel({ type: "mate", value: -2 })).toBe("M2");
  });

  it("returns checkmark for large mate values", () => {
    expect(scoreToLabel({ type: "mate", value: 100 })).toBe("✓");
    expect(scoreToLabel({ type: "mate", value: -100 })).toBe("✓");
  });

  it("returns 0.00 for mate value of 0", () => {
    expect(scoreToLabel({ type: "mate", value: 0 })).toBe("0.00");
  });
});
