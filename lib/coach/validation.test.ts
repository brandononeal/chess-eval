import {
  clampInt,
  isChessComGameUrl,
  isChessComUsername,
  isValidFen,
  normalizeTimeClass,
  parseStudySession,
  sanitizeDrill,
} from "./validation";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const validDrill = () => ({
  id: "https://www.chess.com/game/live/1#5",
  gameUrl: "https://www.chess.com/game/live/1",
  opponent: "someone",
  fen: START_FEN,
  userColor: "w",
  playedSan: "e4",
  bestMoveSan: "d4",
  swing: 250,
  evalBefore: 30,
  moveNumber: 3,
});

describe("isChessComGameUrl", () => {
  it("accepts chess.com https URLs", () => {
    expect(isChessComGameUrl("https://www.chess.com/game/live/1")).toBe(true);
  });
  it("rejects other schemes, hosts, and non-strings", () => {
    expect(isChessComGameUrl("javascript:alert(1)")).toBe(false);
    expect(isChessComGameUrl("http://www.chess.com/game/1")).toBe(false);
    expect(isChessComGameUrl("https://evil.com/game/1")).toBe(false);
    expect(isChessComGameUrl(42)).toBe(false);
    expect(isChessComGameUrl(undefined)).toBe(false);
  });
});

describe("isChessComUsername", () => {
  it("accepts plausible Chess.com usernames", () => {
    expect(isChessComUsername("hikaru")).toBe(true);
    expect(isChessComUsername("Magnus_Carlsen-1")).toBe(true);
    expect(isChessComUsername("abc")).toBe(true);
  });
  it("rejects out-of-bounds lengths, bad charsets, and non-strings", () => {
    expect(isChessComUsername("ab")).toBe(false);
    expect(isChessComUsername("a".repeat(26))).toBe(false);
    expect(isChessComUsername("has space")).toBe(false);
    expect(isChessComUsername("semi;colon")).toBe(false);
    expect(isChessComUsername("")).toBe(false);
    expect(isChessComUsername(42)).toBe(false);
    expect(isChessComUsername(undefined)).toBe(false);
  });
});

describe("isValidFen", () => {
  it("accepts a legal position", () => {
    expect(isValidFen(START_FEN)).toBe(true);
  });
  it("rejects garbage, injections, and non-strings", () => {
    expect(isValidFen("not a fen")).toBe(false);
    expect(isValidFen(`${START_FEN}\nquit`)).toBe(false);
    expect(isValidFen(123)).toBe(false);
  });
});

describe("sanitizeDrill", () => {
  it("returns a clean drill for valid input", () => {
    expect(sanitizeDrill(validDrill())).toEqual(validDrill());
  });

  it("drops unknown fields (no attacker-controlled keys persisted)", () => {
    const result = sanitizeDrill({ ...validDrill(), evil: "payload" });
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("evil");
  });

  it("strips isReview so the server owns review status", () => {
    const result = sanitizeDrill({ ...validDrill(), isReview: true });
    expect(result).not.toHaveProperty("isReview");
  });

  it("rejects a javascript: gameUrl (stored-XSS vector)", () => {
    expect(
      sanitizeDrill({ ...validDrill(), gameUrl: "javascript:alert(1)" }),
    ).toBeNull();
  });

  it("rejects a non-chess.com gameUrl", () => {
    expect(
      sanitizeDrill({ ...validDrill(), gameUrl: "https://evil.com/x" }),
    ).toBeNull();
  });

  it("rejects a malformed fen", () => {
    expect(sanitizeDrill({ ...validDrill(), fen: "bogus" })).toBeNull();
  });

  it("rejects bad ids, colors, and numeric fields", () => {
    expect(sanitizeDrill({ ...validDrill(), id: "" })).toBeNull();
    expect(sanitizeDrill({ ...validDrill(), id: 5 })).toBeNull();
    expect(sanitizeDrill({ ...validDrill(), userColor: "x" })).toBeNull();
    expect(sanitizeDrill({ ...validDrill(), swing: "big" })).toBeNull();
    expect(sanitizeDrill({ ...validDrill(), moveNumber: NaN })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(sanitizeDrill(null)).toBeNull();
    expect(sanitizeDrill("drill")).toBeNull();
    expect(sanitizeDrill(undefined)).toBeNull();
  });
});

describe("parseStudySession", () => {
  it("accepts valid focus + minutes", () => {
    expect(parseStudySession({ focus: "Openings", minutes: 15 })).toEqual({
      focus: "Openings",
      minutes: 15,
    });
  });

  it("accepts the boundary minutes", () => {
    expect(parseStudySession({ focus: "Endgames", minutes: 1 })).not.toBeNull();
    expect(
      parseStudySession({ focus: "Endgames", minutes: 240 }),
    ).not.toBeNull();
  });

  it("rejects unknown focus", () => {
    expect(parseStudySession({ focus: "Blitzing", minutes: 15 })).toBeNull();
  });

  it("rejects out-of-range or non-numeric minutes", () => {
    expect(parseStudySession({ focus: "Openings", minutes: 0 })).toBeNull();
    expect(parseStudySession({ focus: "Openings", minutes: -5 })).toBeNull();
    expect(parseStudySession({ focus: "Openings", minutes: 241 })).toBeNull();
    expect(parseStudySession({ focus: "Openings", minutes: "15" })).toBeNull();
    expect(parseStudySession({ focus: "Openings", minutes: NaN })).toBeNull();
  });

  it("rejects fractional minutes (integer column downstream)", () => {
    expect(parseStudySession({ focus: "Openings", minutes: 12.5 })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseStudySession(null)).toBeNull();
    expect(parseStudySession(42)).toBeNull();
  });
});

describe("clampInt", () => {
  it("passes through in-range values", () => {
    expect(clampInt("30", 1, 90, 7)).toBe(30);
  });
  it("clamps to the bounds", () => {
    expect(clampInt("500", 30, 366, 365)).toBe(366);
    expect(clampInt("5", 30, 366, 365)).toBe(30);
    expect(clampInt("-9", 1, 90, 7)).toBe(1);
  });
  it("falls back on empty, zero, or non-numeric input", () => {
    expect(clampInt("", 1, 90, 7)).toBe(7);
    expect(clampInt("0", 1, 90, 7)).toBe(7);
    expect(clampInt("abc", 1, 90, 7)).toBe(7);
    expect(clampInt(null, 1, 90, 7)).toBe(7);
  });
});

describe("normalizeTimeClass", () => {
  it("keeps recognized classes", () => {
    for (const tc of ["bullet", "blitz", "rapid", "daily"]) {
      expect(normalizeTimeClass(tc)).toBe(tc);
    }
  });
  it("maps anything else to all", () => {
    expect(normalizeTimeClass("all")).toBe("all");
    expect(normalizeTimeClass("hyperbullet")).toBe("all");
    expect(normalizeTimeClass(null)).toBe("all");
    expect(normalizeTimeClass(99)).toBe("all");
  });
});
