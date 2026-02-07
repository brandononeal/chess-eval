// Lightweight analysis for material-based evaluation
// Real Stockfish.js integration can replace this later

export interface AnalysisResult {
  score: number;
  bestMove: string;
  pv: string[];
}

import { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function materialScore(fen: string): number {
  const chess = new Chess(fen);
  const board = chess.board();
  let score = 0;

  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      score += square.color === "w" ? value : -value;
    }
  }

  return score;
}

export async function analyzePosition(
  fen: string,
  depth: number = 15,
): Promise<AnalysisResult> {
  const chess = new Chess(fen);
  const score = materialScore(fen);
  const moves = chess.moves({ verbose: true }) as Array<{
    san: string;
    from: string;
    to: string;
  }>;

  const bestMove = moves[0]?.san ?? "";
  const pv = moves.slice(0, 3).map((m) => m.san);

  return {
    score,
    bestMove,
    pv,
  };
}
