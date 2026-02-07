"use client";

import { useState } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { Analysis } from "./components/Analysis";
import { STARTING_FEN, getMaterialBalance } from "@/lib/chess-utils";

export default function Home() {
  const [history, setHistory] = useState<string[]>([STARTING_FEN]);
  const [currentIndex, setCurrentIndex] = useState(0);

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
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
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
        <div className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold">
          {materialDisplay}
        </div>
      </div>

      <div className="flex">
        <Analysis fen={fen} depth={15} />
        <ChessBoard fen={fen} onMove={handleMove} />
      </div>
    </main>
  );
}
