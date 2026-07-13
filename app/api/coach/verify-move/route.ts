import { NativeEngine, uciToSan } from "@/lib/coach/engine";
import { isValidFen } from "@/lib/coach/validation";
import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERIFY_DEPTH = 14;
const ACCEPT_LOSS_CP = 50;
const BASELINE_CACHE_MAX = 50;

// Retrying a drill re-verifies the same starting fen — cache its baseline
// eval so only the attempted move's position needs a fresh search.
const g = globalThis as {
  __verifyBaselines?: Map<string, { cp: number; bestMoveUci: string }>;
};

// Judges a drill attempt: any move losing less than ACCEPT_LOSS_CP against
// the engine's best line counts as correct, not just the single top move.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const fen = body?.fen;
  const san = body?.san;
  if (!isValidFen(fen) || typeof san !== "string") {
    return NextResponse.json({ error: "fen and san required" }, { status: 400 });
  }

  let fenAfter: string;
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    fenAfter = chess.fen();
    if (!move) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "illegal move or invalid fen" },
      { status: 400 },
    );
  }

  const moverIsWhite = fen.split(" ")[1] === "w";
  const engine = new NativeEngine();
  try {
    await engine.init();
    g.__verifyBaselines ??= new Map();
    let best = g.__verifyBaselines.get(fen);
    if (!best) {
      best = await engine.evaluate(fen, VERIFY_DEPTH);
      if (g.__verifyBaselines.size >= BASELINE_CACHE_MAX) {
        g.__verifyBaselines.clear();
      }
      g.__verifyBaselines.set(fen, best);
    }
    const after = await engine.evaluate(fenAfter, VERIFY_DEPTH);
    const lossCp = moverIsWhite ? best.cp - after.cp : after.cp - best.cp;
    return NextResponse.json({
      accepted: lossCp <= ACCEPT_LOSS_CP,
      lossCp,
      bestSan: uciToSan(fen, best.bestMoveUci),
    });
  } catch (err) {
    console.error("verify-move route failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  } finally {
    engine.quit();
  }
}
