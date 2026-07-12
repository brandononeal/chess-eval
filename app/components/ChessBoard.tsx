"use client";

import { makeMove } from "@/lib/chess-utils";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import type { SquareHandlerArgs } from "react-chessboard/dist/types";

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
}

interface ChessBoardProps {
  fen: string;
  onMove?: (fen: string) => void;
  flipped?: boolean;
  /** When false, pieces can't be moved (replay/scrub mode). */
  interactive?: boolean;
  arrows?: BoardArrow[];
  /** Squares to tint (e.g. last move from/to). */
  highlightSquares?: string[];
}

export function ChessBoard({
  fen,
  onMove,
  flipped,
  interactive = true,
  arrows,
  highlightSquares,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const { ref: containerRef, width: boardWidth } =
    useContainerWidth<HTMLDivElement>();

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => {
    if (!interactive || !targetSquare) return false;
    const newFen = makeMove(fen, sourceSquare, targetSquare);
    if (newFen) {
      onMove?.(newFen);
      setSelectedSquare(null);
      return true;
    }
    return false;
  };

  const handleSquareClick = ({ square }: SquareHandlerArgs) => {
    if (!interactive) return;
    if (selectedSquare) {
      if (selectedSquare !== square) {
        const newFen = makeMove(fen, selectedSquare, square);
        if (newFen) onMove?.(newFen);
      }
      setSelectedSquare(null);
    } else {
      setSelectedSquare(square);
    }
  };

  const squareStyles: Record<string, React.CSSProperties> = {};
  for (const sq of highlightSquares ?? []) {
    squareStyles[sq] = { backgroundColor: "var(--board-last-move)" };
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      ...squareStyles[selectedSquare],
      boxShadow: "inset 0 0 0 3px var(--board-selected)",
    };
  }

  const notationStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: "0.6rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
  };

  return (
    <div
      ref={containerRef}
      className="chess-pieces board-frame aspect-square w-full min-w-0 max-w-[500px] shrink-0"
    >
      <Chessboard
        options={{
          position: fen,
          showNotation: true,
          boardStyle: {
            width: `${boardWidth}px`,
            height: `${boardWidth}px`,
            borderRadius: "var(--board-radius)",
            overflow: "hidden",
          },
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          allowDragging: interactive,
          boardOrientation: flipped ? "black" : "white",
          animationDurationInMs: 180,
          squareStyles,
          arrows: (arrows ?? []).map((a) => ({
            startSquare: a.from,
            endSquare: a.to,
            color: a.color,
          })),
          darkSquareStyle: {
            backgroundColor: "var(--board-dark)",
            backgroundImage:
              "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.10))",
          },
          lightSquareStyle: {
            backgroundColor: "var(--board-light)",
          },
          darkSquareNotationStyle: {
            ...notationStyle,
            color: "var(--board-notation-on-dark)",
          },
          lightSquareNotationStyle: {
            ...notationStyle,
            color: "var(--board-notation-on-light)",
          },
        }}
      />
    </div>
  );
}
