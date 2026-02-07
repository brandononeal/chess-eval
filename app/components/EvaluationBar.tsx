"use client";

interface EvaluationBarProps {
  score: number | null;
}

export function EvaluationBar({ score }: EvaluationBarProps) {
  let percentage = 50;

  if (score !== null) {
    percentage = Math.max(0, Math.min(100, 50 + score * 5));
  }

  return (
    <div
      className="w-10 border-2 border-black box-border"
      style={{
        background: `linear-gradient(to bottom, #000 0%, #000 ${100 - percentage}%, #fff ${100 - percentage}%, #fff 100%)`,
      }}
    />
  );
}
