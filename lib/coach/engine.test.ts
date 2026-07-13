import { uciToSan } from "./engine";

// NativeEngine itself needs a real Stockfish process, so only the pure
// UCI-to-SAN conversion is covered here.

describe("uciToSan", () => {
  it("renders promotions", () => {
    expect(uciToSan("8/4P3/7k/8/8/8/8/4K3 w - - 0 1", "e7e8q")).toBe("e8=Q");
  });

  it("renders castling", () => {
    expect(uciToSan("4k3/8/8/8/8/8/8/4K2R w K - 0 1", "e1g1")).toBe("O-O");
  });

  it("returns empty for illegal moves", () => {
    const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(uciToSan(START, "e2e5")).toBe("");
  });

  it("returns empty for malformed input", () => {
    const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(uciToSan(START, "")).toBe("");
    expect(uciToSan(START, "e2")).toBe("");
  });
});
