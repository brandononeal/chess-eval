import {
  getMaterialBalance,
  getTurn,
  isCheckmate,
  isDraw,
  makeMove,
  STARTING_FEN,
} from "@/lib/chess-utils";

describe("chess-utils", () => {
  describe("STARTING_FEN", () => {
    it("should be the standard starting position", () => {
      expect(STARTING_FEN).toBe(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      );
    });
  });

  describe("makeMove", () => {
    it("returns a new FEN after a legal move", () => {
      const result = makeMove(STARTING_FEN, "e2", "e4");
      expect(result).not.toBeNull();
      expect(result).toContain(" b ");
    });

    it("returns null for an illegal move", () => {
      expect(makeMove(STARTING_FEN, "e2", "e5")).toBeNull();
    });

    it("chains multiple moves correctly", () => {
      const after1 = makeMove(STARTING_FEN, "e2", "e4")!;
      expect(after1).not.toBeNull();
      const after2 = makeMove(after1, "e7", "e5")!;
      expect(after2).not.toBeNull();
      const after3 = makeMove(after2, "g1", "f3")!;
      expect(after3).not.toBeNull();
      expect(getTurn(after3)).toBe("b");
    });
  });

  describe("getMaterialBalance", () => {
    it("returns 0 for the starting position", () => {
      expect(getMaterialBalance(STARTING_FEN)).toBe(0);
    });

    it("returns positive when white has extra material", () => {
      const fen = "r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      expect(getMaterialBalance(fen)).toBe(3);
    });

    it("returns negative when black has extra material", () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
      expect(getMaterialBalance(fen)).toBe(-9);
    });
  });

  describe("isCheckmate", () => {
    it("returns false for the starting position", () => {
      expect(isCheckmate(STARTING_FEN)).toBe(false);
    });

    it("detects fool's mate", () => {
      const fen =
        "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
      expect(isCheckmate(fen)).toBe(true);
    });
  });

  describe("isDraw", () => {
    it("returns false for the starting position", () => {
      expect(isDraw(STARTING_FEN)).toBe(false);
    });

    it("detects stalemate", () => {
      expect(isDraw("8/8/8/8/8/5k2/8/5K2 w - - 0 1")).toBe(true);
    });

    it("detects insufficient material (K vs K)", () => {
      const fen = "8/8/8/8/8/5k2/8/5K2 w - - 0 1";
      expect(isDraw(fen)).toBe(true);
    });
  });

  describe("getTurn", () => {
    it("returns 'w' for the starting position", () => {
      expect(getTurn(STARTING_FEN)).toBe("w");
    });

    it("returns 'b' after white moves", () => {
      const fen = makeMove(STARTING_FEN, "e2", "e4")!;
      expect(getTurn(fen)).toBe("b");
    });
  });
});
