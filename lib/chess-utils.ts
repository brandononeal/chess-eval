import { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

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

export function getMaterialBalance(fen: string): number {
  const chess = new Chess(fen);
  const board = chess.board();
  let white = 0;
  let black = 0;

  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      if (square.color === "w") {
        white += value;
      } else {
        black += value;
      }
    }
  }

  return white - black;
}

export function getMaterialCounts(fen: string): {
  white: number;
  black: number;
} {
  const chess = new Chess(fen);
  const board = chess.board();
  let white = 0;
  let black = 0;

  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      if (square.color === "w") {
        white += value;
      } else {
        black += value;
      }
    }
  }

  return { white, black };
}

export function isCheckmate(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheckmate();
}

export function isDraw(fen: string): boolean {
  const chess = new Chess(fen);
  return (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial()
  );
}

export function getTurn(fen: string): "w" | "b" {
  const chess = new Chess(fen);
  return chess.turn();
}

export const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
