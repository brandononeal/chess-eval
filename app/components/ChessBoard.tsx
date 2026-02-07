"use client";

import { Chessboard } from "react-chessboard";
import { useState, useEffect, useRef } from "react";
import { makeMove } from "@/lib/chess-utils";

interface ChessBoardProps {
  fen: string;
  onMove: (fen: string) => void;
}

export function ChessBoard({ fen, onMove }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setBoardWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
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
      className="aspect-square w-full min-w-[300px] max-w-[500px] shrink-0"
    >
      <Chessboard
        options={{
          position: fen,
          showNotation: true,
          boardStyle: { width: `${boardWidth}px`, height: `${boardWidth}px` },
          onPieceDrop: handlePieceDrop,
        }}
      />
    </div>
  );
}
