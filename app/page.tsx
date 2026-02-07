"use client";

import { useState } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { Analysis } from "./components/Analysis";
import { STARTING_FEN } from "@/lib/chess-utils";

export default function Home() {
  const [fen, setFen] = useState(STARTING_FEN);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex">
        <Analysis fen={fen} depth={15} />
        <ChessBoard fen={fen} onMove={setFen} />
      </div>
    </main>
  );
}
