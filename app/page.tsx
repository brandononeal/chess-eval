"use client";

import { STARTING_FEN, getMaterialBalance } from "@/lib/chess-utils";
import { useEffect, useState } from "react";
import { Analysis } from "./components/Analysis";
import { ChessBoard } from "./components/ChessBoard";
import { ControlBar } from "./components/ControlBar";

export default function Home() {
  const [history, setHistory] = useState<string[]>([STARTING_FEN]);
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
    setHistory([STARTING_FEN]);
    setCurrentIndex(0);
  };

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < history.length - 1;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
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
