"use client";

import { STARTING_FEN, getMaterialBalance } from "@/lib/chess-utils";
import { Chess } from "chess.js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Analysis } from "../components/Analysis";
import { ChessBoard } from "../components/ChessBoard";
import { ControlBar } from "../components/ControlBar";

function initialFen(param: string | null): string {
  if (!param) return STARTING_FEN;
  try {
    new Chess(param);
    return param;
  } catch {
    return STARTING_FEN;
  }
}

function Board() {
  const searchParams = useSearchParams();
  const [history, setHistory] = useState<string[]>([
    initialFen(searchParams.get("fen")),
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEval, setShowEval] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fen = history[currentIndex];
  const material = getMaterialBalance(fen);
  const materialDisplay =
    material === 0
      ? "Equal"
      : material > 0
        ? `White +${material}`
        : `Black +${Math.abs(material)}`;

  const handleMove = (newFen: string) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newFen);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleForward = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleReset = () => {
    setHistory([initialFen(searchParams.get("fen"))]);
    setCurrentIndex(0);
  };

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <Link
        href="/"
        className="fixed left-4 top-4 text-sm text-ink-faint hover:text-brass hover:underline"
      >
        ← Coach
      </Link>
      <ControlBar
        onReset={handleReset}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onFlip={() => setFlipped((v) => !v)}
        showEval={showEval}
        onToggleEval={() => setShowEval((v) => !v)}
        materialDisplay={materialDisplay}
      />

      {mounted && (
        <div className="flex w-full justify-center px-4">
          {showEval && <Analysis fen={fen} depth={15} flipped={flipped} />}
          <ChessBoard fen={fen} onMove={handleMove} flipped={flipped} />
        </div>
      )}
    </main>
  );
}

export default function BoardPage() {
  return (
    <Suspense>
      <Board />
    </Suspense>
  );
}
