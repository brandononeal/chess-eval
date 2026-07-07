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

function deviation(
  expected: string,
  userMoves: string[],
  moveIndex: number,
): RepertoireCheck {
  return {
    expected,
    inRepertoire: false,
    deviationSan: userMoves[moveIndex],
    deviationMoveNumber: moveIndex + 1,
    note: `Left ${expected} territory at move ${moveIndex + 1} (${userMoves[moveIndex] ?? "?"})`,
  };
}

function checkWhite({ userMoves, oppMoves }: MoveCtx): RepertoireCheck {
  const [first] = userMoves;

  if (first === "e4") {
    if (oppMoves[0] !== "e5") {
      return {
        expected: "Italian",
        inRepertoire: null,
        note: `Opponent avoided 1...e5 (played ${oppMoves[0] ?? "?"}) — Italian prep not applicable`,
      };
    }
    const early = userMoves.slice(1, 4);
    if (!early.includes("Nf3")) return deviation("Italian", userMoves, 1);
    if (!early.includes("Bc4") && !early.includes("Bb5"))
      return deviation("Italian", userMoves, 2);
    if (early.includes("Bb5")) {
      return {
        expected: "Italian",
        inRepertoire: false,
        deviationSan: "Bb5",
        deviationMoveNumber: early.indexOf("Bb5") + 2,
        note: "Played the Spanish (Bb5) instead of the Italian (Bc4)",
      };
    }
    return { expected: "Italian", inRepertoire: true, note: "Italian Game" };
  }

  if (first === "d4") {
    const early = userMoves.slice(0, 5);
    if (early.includes("Bf4")) {
      return { expected: "London", inRepertoire: true, note: "London System" };
    }
    if (early.includes("c4") && early.includes("g3")) {
      return { expected: "Catalan", inRepertoire: true, note: "Catalan" };
    }
    if (early.includes("c4")) {
      return {
        expected: "Catalan",
        inRepertoire: false,
        deviationSan: userMoves[2],
        deviationMoveNumber: 3,
        note: "Played c4 but never fianchettoed (g3) — not a Catalan",
      };
    }
    return deviation("London/Catalan", userMoves, 1);
  }

  return {
    expected: "Italian/Catalan/London",
    inRepertoire: false,
    deviationSan: first,
    deviationMoveNumber: 1,
    note: `1.${first ?? "?"} is outside the repertoire (expected 1.e4 or 1.d4)`,
  };
}

function checkBlack({ userMoves, oppMoves }: MoveCtx): RepertoireCheck {
  const [oppFirst] = oppMoves;
  const [first] = userMoves;

  if (oppFirst === "e4") {
    if (first === "c5")
      return { expected: "Sicilian", inRepertoire: true, note: "Sicilian" };
    if (first === "c6")
      return { expected: "Caro-Kann", inRepertoire: true, note: "Caro-Kann" };
    if (first === "d6") {
      const early = userMoves.slice(1, 4);
      if (early.includes("g6"))
        return { expected: "Pirc", inRepertoire: true, note: "Pirc Defense" };
      return {
        expected: "Pirc",
        inRepertoire: false,
        deviationSan: userMoves[1],
        deviationMoveNumber: 2,
        note: "Started 1...d6 but never played g6 — drifted out of the Pirc",
      };
    }
    return {
      expected: "Sicilian/Caro-Kann/Pirc",
      inRepertoire: false,
      deviationSan: first,
      deviationMoveNumber: 1,
      note: `1...${first ?? "?"} vs 1.e4 is outside the repertoire`,
    };
  }

  if (oppFirst === "d4" || oppFirst === "c4" || oppFirst === "Nf3") {
    const early = userMoves.slice(0, 4);
    const hasNf6 = early.includes("Nf6");
    const hasG6 = early.includes("g6");
    if (hasNf6 && hasG6) {
      return {
        expected: "King's Indian",
        inRepertoire: true,
        note: "King's Indian setup",
      };
    }
    const missing = !hasNf6 ? "Nf6" : "g6";
    const idx = early.findIndex(
      (san) => san !== "Nf6" && san !== "g6" && san !== "Bg7" && san !== "d6",
    );
    return {
      expected: "King's Indian",
      inRepertoire: false,
      deviationSan: idx >= 0 ? early[idx] : undefined,
      deviationMoveNumber: idx >= 0 ? idx + 1 : undefined,
      note: `King's Indian setup incomplete — never played ${missing}`,
    };
  }

  return {
    expected: null,
    inRepertoire: null,
    note: `Opponent opened 1.${oppFirst ?? "?"} — repertoire silent here`,
  };
}

export function checkRepertoire(
  sans: string[],
  userColor: "w" | "b",
): RepertoireCheck {
  if (sans.length < 2) {
    return { expected: null, inRepertoire: null, note: "Game too short" };
  }
  const ctx = split(sans, userColor);
  return userColor === "w" ? checkWhite(ctx) : checkBlack(ctx);
}
