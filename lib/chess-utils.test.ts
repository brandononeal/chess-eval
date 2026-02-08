import {
  isLegalMove,
  makeMove,
  getLegalMoves,
  getMoveInSAN,
  getMaterialBalance,
  getMaterialCounts,
  isCheckmate,
  isDraw,
  getTurn,
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

  describe("isLegalMove", () => {
    it("accepts a legal pawn move from the starting position", () => {
      expect(isLegalMove(STARTING_FEN, "e2", "e4")).toBe(true);
    });

    it("accepts a legal knight move", () => {
      expect(isLegalMove(STARTING_FEN, "g1", "f3")).toBe(true);
    });

    it("rejects an illegal pawn move", () => {
      expect(isLegalMove(STARTING_FEN, "e2", "e5")).toBe(false);
    });

    it("rejects moving the wrong color", () => {
      expect(isLegalMove(STARTING_FEN, "e7", "e5")).toBe(false);
    });

    it("rejects moving to an occupied friendly square", () => {
      expect(isLegalMove(STARTING_FEN, "a1", "a2")).toBe(false);
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

  describe("getLegalMoves", () => {
    it("returns legal target squares from the starting position", () => {
      const moves = getLegalMoves(STARTING_FEN);
      expect(moves.length).toBe(20);
    });

    it("includes expected squares", () => {
      const moves = getLegalMoves(STARTING_FEN);
      expect(moves).toContain("e4");
      expect(moves).toContain("e3");
      expect(moves).toContain("f3");
    });
  });

  describe("getMoveInSAN", () => {
    it("returns SAN for a pawn move", () => {
      expect(getMoveInSAN(STARTING_FEN, "e2", "e4")).toBe("e4");
    });

    it("returns SAN for a knight move", () => {
      expect(getMoveInSAN(STARTING_FEN, "g1", "f3")).toBe("Nf3");
    });

    it("returns empty string for an illegal move", () => {
      expect(getMoveInSAN(STARTING_FEN, "e2", "e5")).toBe("");
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

  describe("getMaterialCounts", () => {
    it("returns equal counts for starting position", () => {
      const counts = getMaterialCounts(STARTING_FEN);
      expect(counts.white).toBe(counts.black);
    });

    it("counts material correctly", () => {
      const counts = getMaterialCounts(STARTING_FEN);
      expect(counts.white).toBe(39);
      expect(counts.black).toBe(39);
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
