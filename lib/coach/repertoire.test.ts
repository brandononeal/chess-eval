import { checkRepertoire } from "./repertoire";

describe("checkRepertoire", () => {
  describe("as White", () => {
    it("recognizes the Italian", () => {
      const result = checkRepertoire(
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
        "w",
      );
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("Italian");
    });

    it("flags the Spanish as a deviation from the Italian", () => {
      const result = checkRepertoire(
        ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"],
        "w",
      );
      expect(result.inRepertoire).toBe(false);
      expect(result.deviationSan).toBe("Bb5");
    });

    it("is silent when the opponent avoids 1...e5", () => {
      const result = checkRepertoire(["e4", "c5", "Nf3", "d6"], "w");
      expect(result.inRepertoire).toBeNull();
    });

    it("recognizes the London", () => {
      const result = checkRepertoire(
        ["d4", "d5", "Bf4", "Nf6", "e3", "e6"],
        "w",
      );
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("London");
    });

    it("recognizes the Catalan", () => {
      const result = checkRepertoire(
        ["d4", "Nf6", "c4", "e6", "g3", "d5"],
        "w",
      );
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("Catalan");
    });

    it("flags 1.Nf3 as off-repertoire", () => {
      const result = checkRepertoire(["Nf3", "d5", "g3", "Nf6"], "w");
      expect(result.inRepertoire).toBe(false);
      expect(result.deviationMoveNumber).toBe(1);
    });
  });

  describe("as Black", () => {
    it("recognizes the Sicilian", () => {
      const result = checkRepertoire(["e4", "c5", "Nf3", "d6"], "b");
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("Sicilian");
    });

    it("recognizes the Caro-Kann", () => {
      const result = checkRepertoire(["e4", "c6", "d4", "d5"], "b");
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("Caro-Kann");
    });

    it("recognizes the Pirc", () => {
      const result = checkRepertoire(
        ["e4", "d6", "d4", "Nf6", "Nc3", "g6"],
        "b",
      );
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("Pirc");
    });

    it("flags 1...e5 vs 1.e4 as off-repertoire", () => {
      const result = checkRepertoire(["e4", "e5", "Nf3", "Nc6"], "b");
      expect(result.inRepertoire).toBe(false);
      expect(result.deviationMoveNumber).toBe(1);
    });

    it("recognizes the King's Indian vs 1.d4", () => {
      const result = checkRepertoire(
        ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"],
        "b",
      );
      expect(result.inRepertoire).toBe(true);
      expect(result.expected).toBe("King's Indian");
    });

    it("flags an incomplete King's Indian setup", () => {
      const result = checkRepertoire(
        ["d4", "d5", "c4", "e6", "Nc3", "Nf6"],
        "b",
      );
      expect(result.inRepertoire).toBe(false);
    });

    it("is silent on irregular first moves", () => {
      const result = checkRepertoire(["b3", "e5", "Bb2", "Nc6"], "b");
      expect(result.inRepertoire).toBeNull();
    });
  });

  it("handles games too short to classify", () => {
    const result = checkRepertoire(["e4"], "w");
    expect(result.inRepertoire).toBeNull();
  });
});
