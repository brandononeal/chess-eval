"use client";

import { useEffect, useState } from "react";
import { analyzePosition, AnalysisResult } from "@/lib/stockfish";
import { EvaluationBar } from "./EvaluationBar";

interface AnalysisProps {
  fen: string;
  depth?: number;
}

export function Analysis({ fen, depth }: AnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    analyzePosition(fen, depth).then((result) => {
      setAnalysis(result);
    });
  }, [fen, depth]);

  return <EvaluationBar score={analysis?.score ?? null} />;
}
