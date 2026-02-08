"use client";

import { useStockfish } from "@/lib/useStockfish";
import { EvaluationBar } from "./EvaluationBar";
import type { Score } from "@/lib/stockfish";

interface AnalysisProps {
  fen: string;
  depth?: number;
  flipped?: boolean;
}

export function Analysis({ fen, depth = 15, flipped }: AnalysisProps) {
  const { lines } = useStockfish(fen, depth);

  const topScore: Score | null = lines.length > 0 ? lines[0].score : null;

  return <EvaluationBar score={topScore} flipped={flipped} />;
}
