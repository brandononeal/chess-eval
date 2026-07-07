import { NativeEngine, uciToSan } from "@/lib/coach/engine";
import { Chess } from "chess.js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERIFY_DEPTH = 14;
const ACCEPT_LOSS_CP = 50;

// Judges a drill attempt: any move losing less than ACCEPT_LOSS_CP against
// the engine's best line counts as correct, not just the single top move.
export async function POST(req: NextRequest) {
  const { fen, san } = await req.json();
  if (typeof fen !== "string" || typeof san !== "string") {
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
  await engine.init();
  try {
    const best = await engine.evaluate(fen, VERIFY_DEPTH);
    const after = await engine.evaluate(fenAfter, VERIFY_DEPTH);
    const lossCp = moverIsWhite ? best.cp - after.cp : after.cp - best.cp;
    return NextResponse.json({
      accepted: lossCp <= ACCEPT_LOSS_CP,
      lossCp,
      bestSan: uciToSan(fen, best.bestMoveUci),
    });
  } finally {
    engine.quit();
  }
}
