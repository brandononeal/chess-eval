"use client";

import { useEffect, useRef, useState } from "react";
import { PVLine, StockfishEngine } from "./stockfish";

const DEBOUNCE_MS = 300;

/** Streams multi-PV analysis lines for a position from the WASM engine. */
export function useStockfish(
  fen: string,
  depth: number = 20,
  multiPV: number = 3,
): { lines: PVLine[] } {
  const engineRef = useRef<StockfishEngine | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lines, setLines] = useState<PVLine[]>([]);

  const fenRef = useRef(fen);
  const depthRef = useRef(depth);
  fenRef.current = fen;
  depthRef.current = depth;

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;

    engine.onReady(() => engine.analyze(fenRef.current, depthRef.current));
    engine.onInfo((newLines) => setLines([...newLines]));
    engine.onError((err) => console.warn(err));

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
      engine.analyze(fen, depth);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fen, depth]);

  return { lines };
}
