"use client";

import { useEffect, useRef, useState } from "react";
import { PVLine, StockfishEngine } from "./stockfish";

export interface UseStockfishResult {
  lines: PVLine[];
  bestMove: string;
  currentDepth: number;
  isAnalyzing: boolean;
  isReady: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 300;

export function useStockfish(
  fen: string,
  depth: number = 20,
  multiPV: number = 3,
): UseStockfishResult {
  const engineRef = useRef<StockfishEngine | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lines, setLines] = useState<PVLine[]>([]);
  const [bestMove, setBestMove] = useState("");
  const [currentDepth, setCurrentDepth] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fenRef = useRef(fen);
  const depthRef = useRef(depth);
  fenRef.current = fen;
  depthRef.current = depth;

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;

    engine.onReady(() => {
      setIsReady(true);
      engine.analyze(fenRef.current, depthRef.current);
      setIsAnalyzing(true);
    });

    engine.onInfo((newLines, depth) => {
      setLines([...newLines]);
      setCurrentDepth(depth);
    });

    engine.onBestMove((move) => {
      setBestMove(move);
      setIsAnalyzing(false);
    });

    engine.onError((err) => {
      setError(err);
      setIsAnalyzing(false);
    });

    engine.init(multiPV);

    return () => {
      engine.destroy();
      engineRef.current = null;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLines([]);
      setBestMove("");
      setCurrentDepth(0);
      setIsAnalyzing(true);
      engine.analyze(fen, depth);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fen, depth]);

  return { lines, bestMove, currentDepth, isAnalyzing, isReady, error };
}
