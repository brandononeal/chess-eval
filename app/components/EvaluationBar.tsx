"use client";

import type { Score } from "@/lib/stockfish";

interface EvaluationBarProps {
  score: Score | null;
  flipped?: boolean;
}

function scoreToPercentage(score: Score): number {
  if (score.type === "mate") {
    const absValue = Math.abs(score.value);
    const isCheckmate = absValue >= 100;
    return score.value > 0 ? (isCheckmate ? 100 : 95) : isCheckmate ? 0 : 5;
  }
  return Math.max(0, Math.min(100, 50 + (score.value / 100) * 5));
}

function scoreToLabel(score: Score): string {
  if (score.type === "mate") {
    const v = score.value;
    const absValue = Math.abs(v);
    if (absValue >= 100) return "✓";
    if (v > 0) return `M${v}`;
    if (v < 0) return `M${absValue}`;
    return "0.00";
  }
  const pawns = Math.abs(score.value / 100);
  if (pawns === 0) return "=";
  return pawns.toFixed(1);
}

export function EvaluationBar({ score, flipped }: EvaluationBarProps) {
  const percentage = score ? scoreToPercentage(score) : 50;
  const isWhiteAdvantage = score
    ? score.type === "mate"
      ? score.value >= 0
      : score.value >= 0
    : true;

  const label = score ? scoreToLabel(score) : "0.0";

  return (
    <div
      className="eval-bar w-8 border border-zinc-700 relative select-none flex-shrink-0 overflow-hidden"
      style={{ transform: flipped ? "scaleY(-1)" : "none" }}
    >
      <div
        style={{ backgroundColor: "#1a1a1a", height: `${100 - percentage}%` }}
      />
      <div style={{ backgroundColor: "#e8e8e8", height: `${percentage}%` }} />
      <div
        className={`absolute left-1/2 text-[10px] font-bold leading-none ${
          isWhiteAdvantage ? "bottom-1" : "top-1"
        }`}
        style={{
          color: isWhiteAdvantage ? "#333333" : "#ffffff",
          transform: flipped
            ? "translateX(-50%) scaleY(-1)"
            : "translateX(-50%)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
