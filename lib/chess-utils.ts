import { Chess } from "chess.js";

export function isLegalMove(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const move = chess.move({ from, to, promotion: "q" });
  return move !== null;
}

export function makeMove(fen: string, from: string, to: string): string | null {
  const chess = new Chess(fen);
  const move = chess.move({ from, to, promotion: "q" });
  return move ? chess.fen() : null;
}

export function getLegalMoves(fen: string): string[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true }) as any[];
  return moves.map((m) => m.to);
}

export function getMoveInSAN(fen: string, from: string, to: string): string {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  const move = moves.find((m) => m.from === from && m.to === to);
  return move ? move.san : "";
}

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
