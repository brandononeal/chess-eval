"use client";

import type { Score } from "@/lib/stockfish";

interface EvaluationBarProps {
  score: Score | null;
}

function scoreToPercentage(score: Score): number {
  if (score.type === "mate") {
    return score.value > 0 ? 95 : score.value < 0 ? 5 : 50;
  }
  return Math.max(0, Math.min(100, 50 + (score.value / 100) * 5));
}

function scoreToLabel(score: Score): string {
  if (score.type === "mate") {
    const v = score.value;
    if (v > 0) return `M${v}`;
    if (v < 0) return `M${Math.abs(v)}`;
    return "0.00";
  }
  const pawns = Math.abs(score.value / 100);
  return pawns.toFixed(1);
}

export function EvaluationBar({ score }: EvaluationBarProps) {
  const percentage = score ? scoreToPercentage(score) : 50;
  const isWhiteAdvantage = score
    ? score.type === "mate"
      ? score.value >= 0
      : score.value >= 0
    : true;

  const label = score ? scoreToLabel(score) : "0.0";

  return (
    <div
      className="w-8 border border-zinc-700 relative select-none flex-shrink-0"
      style={{
        background: `linear-gradient(to bottom, #1a1a1a 0%, #1a1a1a ${100 - percentage}%, #e8e8e8 ${100 - percentage}%, #e8e8e8 100%)`,
      }}
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-bold leading-none ${
          isWhiteAdvantage ? "bottom-1 text-zinc-800" : "top-1 text-zinc-300"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
