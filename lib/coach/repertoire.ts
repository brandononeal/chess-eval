import type { RepertoireCheck } from "./types";

// The player's repertoire:
//   White: Italian, Catalan, London
//   Black: Sicilian, Caro-Kann, King's Indian, Pirc
//
// Heuristic prefix matching — checks whether the user's early moves fit one of
// these systems. `inRepertoire: null` means the repertoire has nothing to say
// about the line (e.g. the opponent sidestepped it), not a deviation.

interface MoveCtx {
  userMoves: string[];
  oppMoves: string[];
}

function split(sans: string[], userColor: "w" | "b"): MoveCtx {
  const userMoves: string[] = [];
  const oppMoves: string[] = [];
  sans.forEach((san, i) => {
    const isWhiteMove = i % 2 === 0;
    if ((userColor === "w") === isWhiteMove) userMoves.push(san);
    else oppMoves.push(san);
  });
  return { userMoves, oppMoves };
}

function inBook(note: string): RepertoireCheck {
  return { inRepertoire: true, note };
}

function offBook(note: string): RepertoireCheck {
  return { inRepertoire: false, note };
}

function silent(note: string): RepertoireCheck {
  return { inRepertoire: null, note };
}

function deviation(
  expected: string,
  userMoves: string[],
  moveIndex: number,
): RepertoireCheck {
  return offBook(
    `Left ${expected} territory at move ${moveIndex + 1} (${userMoves[moveIndex] ?? "?"})`,
  );
}

function checkWhite({ userMoves, oppMoves }: MoveCtx): RepertoireCheck {
  const [first] = userMoves;

  if (first === "e4") {
    if (oppMoves[0] !== "e5") {
      return silent(
        `Opponent avoided 1...e5 (played ${oppMoves[0] ?? "?"}) — Italian prep not applicable`,
      );
    }
    const early = userMoves.slice(1, 4);
    if (!early.includes("Nf3")) return deviation("Italian", userMoves, 1);
    if (!early.includes("Bc4") && !early.includes("Bb5"))
      return deviation("Italian", userMoves, 2);
    if (early.includes("Bb5")) {
      return offBook("Played the Spanish (Bb5) instead of the Italian (Bc4)");
    }
    return inBook("Italian Game");
  }

  if (first === "d4") {
    const early = userMoves.slice(0, 5);
    if (early.includes("Bf4")) return inBook("London System");
    if (early.includes("c4") && early.includes("g3")) return inBook("Catalan");
    if (early.includes("c4")) {
      return offBook("Played c4 but never fianchettoed (g3) — not a Catalan");
    }
    return deviation("London/Catalan", userMoves, 1);
  }

  return offBook(
    `1.${first ?? "?"} is outside the repertoire (expected 1.e4 or 1.d4)`,
  );
}

function checkBlack({ userMoves, oppMoves }: MoveCtx): RepertoireCheck {
  const [oppFirst] = oppMoves;
  const [first] = userMoves;

  if (oppFirst === "e4") {
    if (first === "c5") return inBook("Sicilian");
    if (first === "c6") return inBook("Caro-Kann");
    if (first === "d6") {
      const early = userMoves.slice(1, 4);
      if (early.includes("g6")) return inBook("Pirc Defense");
      return offBook(
        "Started 1...d6 but never played g6 — drifted out of the Pirc",
      );
    }
    return offBook(
      `1...${first ?? "?"} vs 1.e4 is outside the repertoire`,
    );
  }

  if (oppFirst === "d4" || oppFirst === "c4" || oppFirst === "Nf3") {
    const early = userMoves.slice(0, 4);
    const hasNf6 = early.includes("Nf6");
    const hasG6 = early.includes("g6");
    if (hasNf6 && hasG6) return inBook("King's Indian setup");
    const missing = !hasNf6 ? "Nf6" : "g6";
    return offBook(`King's Indian setup incomplete — never played ${missing}`);
  }

  return silent(
    `Opponent opened 1.${oppFirst ?? "?"} — repertoire silent here`,
  );
}

export function checkRepertoire(
  sans: string[],
  userColor: "w" | "b",
): RepertoireCheck {
  if (sans.length < 2) {
    return silent("Game too short");
  }
  const ctx = split(sans, userColor);
  return userColor === "w" ? checkWhite(ctx) : checkBlack(ctx);
}
