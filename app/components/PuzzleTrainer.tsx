"use client";

import type { Drill } from "@/lib/coach/types";
import { formatEval, sanBetween } from "@/lib/coach/ui-utils";
import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChessBoard, type BoardArrow } from "./ChessBoard";

type Status = "trying" | "checking" | "solved" | "wrong" | "revealed";

function squares(fen: string, san: string): { from: string; to: string } | null {
  try {
    const m = new Chess(fen).move(san);
    return m ? { from: m.from, to: m.to } : null;
  } catch {
    return null;
  }
}

function fenAfter(fen: string, san: string): string {
  try {
    const c = new Chess(fen);
    c.move(san);
    return c.fen();
  } catch {
    return fen;
  }
}

function reportResult(drill: Drill, passed: boolean, username: string | null): void {
  fetch("/api/coach/drill-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drill, passed, username: username ?? undefined }),
  }).catch(() => {});
}

export function PuzzleTrainer({
  drills,
  username,
}: {
  drills: Drill[];
  username: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("trying");
  const [attempt, setAttempt] = useState("");
  const [acceptedAlt, setAcceptedAlt] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);

  const done = index >= drills.length;
  const drill = drills[index];

  const reset = useCallback(() => {
    setStatus("trying");
    setAttempt("");
    setAcceptedAlt(false);
    setShowHint(false);
    setShake(false);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(drills.length, i + 1));
    reset();
  }, [drills.length, reset]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    reset();
  }, [reset]);

  const resolved = status === "solved" || status === "revealed";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && resolved) goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [resolved, goNext, goPrev]);

  const best = useMemo(
    () => (drill ? squares(drill.fen, drill.bestMoveSan) : null),
    [drill],
  );

  if (done) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="font-display text-2xl font-semibold">
          Session complete
        </div>
        <p className="text-ink-soft">
          Solved <span className="font-mono text-brass">{solved.size}</span> of{" "}
          <span className="font-mono">{drills.length}</span>.
        </p>
        <button
          onClick={() => {
            setIndex(0);
            setSolved(new Set());
            reset();
          }}
          className="mt-2 rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised"
        >
          Start over
        </button>
      </div>
    );
  }

  // Board position + telestrator arrows for the current state.
  let position = drill.fen;
  let arrows: BoardArrow[] = [];
  if (status === "solved") {
    position = fenAfter(drill.fen, attempt);
    const s = squares(drill.fen, attempt);
    if (s) arrows = [{ ...s, color: "var(--arrow-best)" }];
  } else if (status === "revealed") {
    position = fenAfter(drill.fen, drill.bestMoveSan);
    const played = squares(drill.fen, drill.playedSan);
    if (played) arrows.push({ ...played, color: "var(--arrow-played)" });
    if (best && best.to !== played?.to)
      arrows.push({ ...best, color: "var(--arrow-best)" });
  }
  const highlight =
    showHint && status !== "solved" && best ? [best.from] : undefined;

  const handleMove = async (newFen: string) => {
    // "wrong" stays interactive so you can keep trying until you find it.
    if (status !== "trying" && status !== "wrong") return;
    const san = sanBetween(drill.fen, newFen);
    setAttempt(san);

    if (san === drill.bestMoveSan) {
      setAcceptedAlt(false);
      setStatus("solved");
      setSolved((s) => new Set(s).add(drill.id));
      reportResult(drill, true, username);
      return;
    }

    setStatus("checking");
    try {
      const res = await fetch("/api/coach/verify-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: drill.fen, san }),
      });
      const verdict = await res.json();
      if (res.ok && verdict.accepted) {
        setAcceptedAlt(true);
        setStatus("solved");
        setSolved((s) => new Set(s).add(drill.id));
        reportResult(drill, true, username);
        return;
      }
    } catch {
      // fall through to wrong
    }
    setStatus("wrong");
    setShake(true);
    setTimeout(() => setShake(false), 300);
    reportResult(drill, false, username);
  };

  const reveal = () => {
    setStatus("revealed");
    reportResult(drill, false, username);
  };

  const toMove = drill.userColor === "w" ? "White" : "Black";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between gap-3">
        <div className="kicker">
          Puzzle {index + 1} / {drills.length}
        </div>
        <div className="flex items-center gap-1.5">
          {drills.map((d, i) => (
            <span
              key={d.id}
              className={`h-1.5 w-1.5 rounded-full ${
                solved.has(d.id)
                  ? "bg-brass"
                  : i === index
                    ? "bg-ink-soft"
                    : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

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
          <span className="font-mono">{drill.moveNumber}</span>
        </span>
      </div>

      <div
        className={`mx-auto w-full ${shake ? "drill-wrong" : ""}`}
        style={{ maxWidth: 420 }}
      >
        <ChessBoard
          fen={position}
          onMove={handleMove}
          interactive={status === "trying" || status === "wrong"}
          flipped={drill.userColor === "b"}
          arrows={arrows}
          highlightSquares={highlight}
        />
      </div>

      <p className="text-center text-sm text-ink-soft">
        <span className="font-medium text-ink">{toMove} to move.</span> You played{" "}
        <span className="font-mono">{drill.playedSan}</span> and lost{" "}
        <span className="font-mono">
          {formatEval(drill.swing).replace("+", "")}
        </span>{" "}
        pawns — find the better move.
      </p>

      {/* Feedback line */}
      <div className="min-h-6 text-center font-mono text-sm">
        {status === "checking" && (
          <span className="inline-flex items-center gap-2 text-ink-faint">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brass" />
            Checking {attempt} with Stockfish…
          </span>
        )}
        {status === "solved" && (
          <span className="font-semibold text-[color:var(--telestrator-best)]">
            {acceptedAlt
              ? `✓ ${attempt} works too · engine: ${drill.bestMoveSan}`
              : `✓ ${drill.bestMoveSan} — best move`}
          </span>
        )}
        {status === "wrong" && (
          <span className="font-semibold text-[color:var(--telestrator-played)]">
            ✗ {attempt || "That move"} isn&apos;t it — try again.
          </span>
        )}
        {status === "revealed" && (
          <span className="font-semibold text-brass">
            Best was {drill.bestMoveSan}.
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-raised disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Previous puzzle"
        >
          ←
        </button>

        {(status === "trying" || status === "wrong") && (
          <>
            <button
              onClick={() => setShowHint(true)}
              disabled={showHint}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised disabled:opacity-40"
            >
              Hint
            </button>
            <button
              onClick={reveal}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-raised"
            >
              Show solution
            </button>
          </>
        )}

        {resolved && (
          <button
            onClick={goNext}
            className="rounded-lg border border-brass bg-brass-subtle px-5 py-2 text-sm font-semibold text-brass hover:bg-raised"
          >
            {index === drills.length - 1 ? "Finish" : "Next →"}
          </button>
        )}

        <a
          href={drill.gameUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded px-3 py-2 text-sm text-ink-faint hover:text-brass hover:underline"
        >
          Game ↗
        </a>
      </div>
    </div>
  );
}
