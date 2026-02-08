"use client";

import { Chessboard } from "react-chessboard";
import { useState, useEffect, useRef } from "react";
import { makeMove } from "@/lib/chess-utils";
import { useDarkReader } from "@/lib/useDarkReader";

interface ChessBoardProps {
  fen: string;
  onMove: (fen: string) => void;
  flipped?: boolean;
}

export function ChessBoard({ fen, onMove, flipped }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);
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
      return true;
    }
    return false;
  };

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
          boardOrientation: flipped ? "black" : "white",
          ...(darkReader && {
            customDarkSquareStyle: { backgroundColor: "#4b4847" },
            customLightSquareStyle: { backgroundColor: "#7a7572" },
          }),
        }}
      />
    </div>
  );
}
