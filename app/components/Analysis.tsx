"use client";

import { useStockfish } from "@/lib/useStockfish";
import { EvaluationBar } from "./EvaluationBar";
import { isCheckmate, isDraw, getTurn } from "@/lib/chess-utils";
import type { Score } from "@/lib/stockfish";

interface AnalysisProps {
  fen: string;
  depth?: number;
  flipped?: boolean;
}

export function Analysis({ fen, depth = 15, flipped }: AnalysisProps) {
  const { lines } = useStockfish(fen, depth);

  let topScore: Score | null = lines.length > 0 ? lines[0].score : null;

  if (isCheckmate(fen)) {
    const turn = getTurn(fen);
    topScore = {
      type: "mate",
      value: turn === "w" ? -1000 : 1000,
    };
  } else if (isDraw(fen)) {
    topScore = {
      type: "cp",
      value: 0,
    };
  }

  return <EvaluationBar score={topScore} flipped={flipped} />;
}
