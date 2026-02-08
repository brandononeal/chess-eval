"use client";

import { makeMove } from "@/lib/chess-utils";
import { useDarkReader } from "@/lib/useDarkReader";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { SquareHandlerArgs } from "react-chessboard/dist/types";

interface ChessBoardProps {
  fen: string;
  onMove: (fen: string) => void;
  flipped?: boolean;
}

export function ChessBoard({ fen, onMove, flipped }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const darkReader = useDarkReader();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBoardWidth(Math.round(e.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string;
  }) => {
    const newFen = makeMove(fen, sourceSquare, targetSquare);
    if (newFen) {
      onMove(newFen);
      setSelectedSquare(null);
      return true;
    }
    return false;
  };

  const handleSquareClick = ({ square }: SquareHandlerArgs) => {
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }
      const newFen = makeMove(fen, selectedSquare, square);
      if (newFen) {
        onMove(newFen);
        setSelectedSquare(null);
      } else {
        setSelectedSquare(null);
      }
    } else {
      setSelectedSquare(square);
    }
  };

  const squareStyles = selectedSquare
    ? { [selectedSquare]: { boxShadow: "inset 0 0 0 4px #facc15" } }
    : undefined;
  const darkAlphaNotationStyle = darkReader
    ? { color: "#d1d5db", fontWeight: "bold" }
    : undefined;
  const darkNumericNotationStyle = darkReader
    ? { color: "#d1d5db", fontWeight: "bold" }
    : undefined;

  return (
    <div
      ref={containerRef}
      className="chess-pieces aspect-square w-full min-w-[300px] max-w-[500px] shrink-0"
    >
      <Chessboard
        options={{
          position: fen,
          showNotation: true,
          boardStyle: { width: `${boardWidth}px`, height: `${boardWidth}px` },
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          boardOrientation: flipped ? "black" : "white",
          squareStyles,
          darkSquareStyle: darkReader
            ? { backgroundColor: "#4b4847" }
            : undefined,
          lightSquareStyle: darkReader
            ? { backgroundColor: "#7a7572" }
            : undefined,
          alphaNotationStyle: darkAlphaNotationStyle,
          numericNotationStyle: darkNumericNotationStyle,
        }}
      />
    </div>
  );
}
