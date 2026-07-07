"use client";

import type { GameAnalysis, MoveIssue } from "@/lib/coach/types";
import {
  RESULT_LABEL,
  SEVERITY_GLYPH,
  SEVERITY_TEXT,
  formatClock,
  formatDate,
  formatEval,
} from "@/lib/coach/ui-utils";
import { Chess } from "chess.js";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChessBoard, type BoardArrow } from "./ChessBoard";
import { EvalGraph } from "./EvalGraph";

interface GameReplayProps {
  analysis: GameAnalysis;
  initialPly?: number;
  onClose: () => void;
}

interface ReplayMove {
  san: string;
  from: string;
  to: string;
  fenAfter: string;
}

function moveSquares(fen: string, san: string): BoardArrow | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(san);
    return move ? { from: move.from, to: move.to, color: "" } : null;
  } catch {
    return null;
  }
}

export function GameReplay({ analysis, initialPly, onClose }: GameReplayProps) {
  const { game, issues, evals } = analysis;
  const [ply, setPly] = useState(
    Math.max(0, Math.min(initialPly ?? 0, game.sans.length)),
  );
  const moveListRef = useRef<HTMLDivElement>(null);
  // Only close on clicks that STARTED on the scrim — a text-selection drag
  // from inside the panel that ends on the scrim must not dismiss the modal.
  const scrimPress = useRef(false);

  const { startFen, moves } = useMemo(() => {
    const chess = new Chess();
    const startFen = chess.fen();
    const moves: ReplayMove[] = [];
    for (const san of game.sans) {
      const move = chess.move(san);
      moves.push({
        san,
        from: move.from,
        to: move.to,
        fenAfter: chess.fen(),
      });
    }
    return { startFen, moves };
  }, [game.sans]);

  const issueByPly = useMemo(() => {
    const map = new Map<number, MoveIssue>();
    for (const issue of issues) map.set(issue.ply, issue);
    return map;
  }, [issues]);

  const fen = ply === 0 ? startFen : moves[ply - 1].fenAfter;
  const lastMove = ply > 0 ? moves[ply - 1] : null;
  const nextIssue = issueByPly.get(ply + 1);

  // The telestrator pair: played error first so the engine's best renders on top.
  const arrows = useMemo(() => {
    if (!nextIssue) return [];
    const result: BoardArrow[] = [];
    // The played move's squares are already known from the replay parse.
    const played = moves[nextIssue.ply - 1];
    const best = moveSquares(fen, nextIssue.bestMoveSan);
    if (played)
      result.push({
        from: played.from,
        to: played.to,
        color: "var(--arrow-played)",
      });
    if (best && best.to !== played?.to)
      result.push({ ...best, color: "var(--arrow-best)" });
    return result;
  }, [fen, moves, nextIssue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight")
        setPly((p) => Math.min(moves.length, p + 1));
      else if (e.key === "Home") setPly(0);
      else if (e.key === "End") setPly(moves.length);
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moves.length, onClose]);

  useEffect(() => {
    moveListRef.current
      ?.querySelector('[data-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [ply]);

  const currentEval = evals[ply] ?? 0;
  const controls: Array<[string, () => void]> = [
    ["⏮", () => setPly(0)],
    ["◀", () => setPly((p) => Math.max(0, p - 1))],
    ["▶", () => setPly((p) => Math.min(moves.length, p + 1))],
    ["⏭", () => setPly(moves.length)],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--scrim)] p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        scrimPress.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (scrimPress.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-[14px] border border-line-strong border-t-[color:var(--accent-hairline)] bg-raised p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold">
              {RESULT_LABEL[game.result]} vs {game.opponent}
              <span className="ml-2 font-mono text-sm font-normal text-ink-faint">
                ({game.opponentRating})
              </span>
            </h3>
            <p className="text-sm text-ink-soft">
              {formatDate(game.endTime)} ·{" "}
              <span className="font-display italic">{game.openingName}</span> ·{" "}
              <a
                href={game.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brass hover:underline"
              >
                chess.com ↗
              </a>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 text-xl text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="p-1.5 sm:w-[55%]">
            <ChessBoard
              fen={fen}
              onMove={() => {}}
              interactive={false}
              flipped={game.userColor === "b"}
              arrows={arrows}
              highlightSquares={
                lastMove ? [lastMove.from, lastMove.to] : undefined
              }
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-mono text-lg font-semibold">
                {formatEval(currentEval)}
              </span>
              {nextIssue && (
                <span className="text-right text-xs text-ink-soft">
                  <span className={SEVERITY_TEXT[nextIssue.severity]}>
                    {nextIssue.severity}
                  </span>{" "}
                  next · best{" "}
                  <span className="font-mono">{nextIssue.bestMoveSan}</span>
                  {nextIssue.clockSeconds !== undefined && (
                    <span className="font-mono">
                      {" "}
                      · {formatClock(nextIssue.clockSeconds)} left
                    </span>
                  )}
                </span>
              )}
            </div>

            <div className="well p-1.5">
              <EvalGraph
                evals={evals}
                issues={issues}
                currentPly={ply}
                onSeek={setPly}
              />
            </div>

            <div
              ref={moveListRef}
              className="move-list min-h-24 flex-1 overflow-y-auto rounded-md border border-line p-2 font-mono text-[13px] leading-7"
            >
              {Array.from(
                { length: Math.ceil(moves.length / 2) },
                (_, i) => i,
              ).map((i) => (
                <div key={i} className="flex gap-1">
                  <span className="w-8 shrink-0 text-right text-ink-faint">
                    {i + 1}.
                  </span>
                  {[moves[i * 2], moves[i * 2 + 1]].map((move, half) => {
                    if (!move) return null;
                    const movePly = i * 2 + half + 1;
                    const issue = issueByPly.get(movePly);
                    const isCurrent = ply === movePly;
                    return (
                      <button
                        key={half}
                        data-current={isCurrent}
                        onClick={() => setPly(movePly)}
                        className={`min-w-14 rounded-[3px] px-1 text-left ${
                          isCurrent
                            ? "border-l-2 border-brass bg-brass-subtle"
                            : "hover:bg-raised"
                        }`}
                      >
                        {move.san}
                        {issue && (
                          <span className={SEVERITY_TEXT[issue.severity]}>
                            {SEVERITY_GLYPH[issue.severity]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {controls.map(([label, onClick]) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="rounded-md border border-line px-3 py-1 text-sm hover:bg-raised"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Link
                href={`/board?fen=${encodeURIComponent(fen)}`}
                className="text-sm text-ink-faint hover:text-brass hover:underline"
              >
                Explore on board →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
