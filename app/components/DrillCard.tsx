"use client";

import type { Drill } from "@/lib/coach/types";
import { formatEval, sanBetween } from "@/lib/coach/ui-utils";
import { useState } from "react";
import { ChessBoard } from "./ChessBoard";

interface DrillCardProps {
  drill: Drill;
  index: number;
}

type Status = "trying" | "checking" | "correct" | "wrong" | "revealed";

// The telestrator pair — same hues as the board arrows.
const STATE_STYLES: Record<Status, string> = {
  trying: "",
  checking: "",
  correct:
    "border-[color:var(--telestrator-best)] bg-[color:var(--telestrator-best-wash)]",
  wrong:
    "drill-wrong border-[color:var(--telestrator-played)] bg-[color:var(--telestrator-played-wash)]",
  revealed: "border-brass",
};

function reportResult(drill: Drill, passed: boolean): void {
  fetch("/api/coach/drill-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drill, passed }),
  }).catch(() => {});
}

export function DrillCard({ drill, index }: DrillCardProps) {
  const [fen, setFen] = useState(drill.fen);
  const [status, setStatus] = useState<Status>("trying");
  const [attempt, setAttempt] = useState("");
  const [acceptedAlt, setAcceptedAlt] = useState(false);

  const handleMove = async (newFen: string) => {
    if (status !== "trying") return;
    const san = sanBetween(fen, newFen);
    setAttempt(san);

    if (san === drill.bestMoveSan) {
      setFen(newFen);
      setAcceptedAlt(false);
      setStatus("correct");
      reportResult(drill, true);
      return;
    }

    // Not the engine's #1 — ask the server whether it's good enough.
    setStatus("checking");
    try {
      const res = await fetch("/api/coach/verify-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: drill.fen, san }),
      });
      const verdict = await res.json();
      if (res.ok && verdict.accepted) {
        setFen(newFen);
        setAcceptedAlt(true);
        setStatus("correct");
        reportResult(drill, true);
        return;
      }
    } catch {
      // fall through to wrong
    }
    setStatus("wrong");
    reportResult(drill, false);
  };

  const reset = () => {
    setFen(drill.fen);
    setStatus("trying");
    setAttempt("");
  };

  const reveal = () => {
    setStatus("revealed");
    reportResult(drill, false);
  };

  return (
    <div
      className={`card flex flex-col gap-3 p-5 transition-colors duration-200 ${STATE_STYLES[status]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-medium">
          № {index + 1}
          {drill.isReview && (
            <span className="ml-2 rounded-full border border-brass px-2 py-0.5 align-middle font-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-brass">
              Review
            </span>
          )}
        </span>
        <span className="text-[13px] text-ink-soft">
          vs {drill.opponent} · move{" "}
          <span className="font-mono">{drill.moveNumber}</span> · was{" "}
          <span className="font-mono">{formatEval(drill.evalBefore)}</span>
        </span>
      </div>

      <div className="p-1.5">
        <ChessBoard
          fen={fen}
          onMove={handleMove}
          flipped={drill.userColor === "b"}
        />
      </div>

      <p className="text-sm text-ink-soft">
        You played <span className="font-mono">{drill.playedSan}</span> and
        lost{" "}
        <span className="font-mono">
          {formatEval(drill.swing).replace("+", "")}
        </span>{" "}
        pawns. Find the better move.
      </p>

      {status === "checking" && (
        <p className="text-sm text-ink-faint">
          Checking <span className="font-mono">{attempt}</span> with Stockfish…
        </p>
      )}
      {status === "correct" && (
        <p className="font-mono text-sm font-semibold text-[color:var(--telestrator-best)]">
          {acceptedAlt
            ? `✓ ${attempt} also works · engine: ${drill.bestMoveSan}`
            : `✓ ${drill.bestMoveSan} — best`}
        </p>
      )}
      {status === "wrong" && (
        <p className="font-mono text-sm font-semibold text-[color:var(--telestrator-played)]">
          ✗ {attempt || "That move"} isn&apos;t it.
        </p>
      )}
      {status === "revealed" && (
        <p className="font-mono text-sm font-semibold text-brass">
          Best was {drill.bestMoveSan}
        </p>
      )}

      <div className="flex gap-2">
        {(status === "wrong" || status === "revealed") && (
          <button
            onClick={reset}
            className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-raised"
          >
            Try again
          </button>
        )}
        {status === "trying" && (
          <button
            onClick={reveal}
            className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-raised"
          >
            Reveal
          </button>
        )}
        <a
          href={drill.gameUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded px-3 py-1 text-sm text-ink-soft hover:text-brass hover:underline"
        >
          View game ↗
        </a>
      </div>
    </div>
  );
}
