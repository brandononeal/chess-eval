"use client";

import { STARTING_FEN, getMaterialBalance } from "@/lib/chess-utils";
import { useEffect, useState } from "react";
import { Analysis } from "./components/Analysis";
import { ChessBoard } from "./components/ChessBoard";

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
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
        >
          Reset
        </button>
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
        >
          ← Back
        </button>
        <button
          onClick={handleForward}
          disabled={!canGoForward}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
        >
          Forward →
        </button>
        <button
          onClick={() => setFlipped((v) => !v)}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
        >
          Flip
        </button>
        <button
          onClick={() => setShowEval((v) => !v)}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
        >
          {showEval ? "Hide Eval" : "Show Eval"}
        </button>
        <div className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold">
          {materialDisplay}
        </div>
      </div>

      {mounted && (
        <div className="flex w-full justify-center px-4">
          {showEval && <Analysis fen={fen} depth={15} flipped={flipped} />}
          <ChessBoard fen={fen} onMove={handleMove} flipped={flipped} />
        </div>
      )}
    </main>
  );
}
