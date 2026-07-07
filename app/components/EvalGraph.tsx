"use client";

import type { MoveIssue } from "@/lib/coach/types";
import { SEVERITY_VAR } from "@/lib/coach/ui-utils";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { useMemo, useRef } from "react";

interface EvalGraphProps {
  /** Eval per position (start + one per ply), White POV centipawns. */
  evals: number[];
  issues: MoveIssue[];
  currentPly: number;
  onSeek: (ply: number) => void;
}

const HEIGHT = 96;
const SCALE_CP = 600; // evals compress into ±SCALE_CP for display

export function EvalGraph({
  evals,
  issues,
  currentPly,
  onSeek,
}: EvalGraphProps) {
  const { ref: containerRef, width } = useContainerWidth<HTMLDivElement>();
  const dragging = useRef(false);

  const n = evals.length;
  const x = (ply: number) => (n > 1 ? (ply / (n - 1)) * width : 0);
  const y = (cp: number) => {
    const clamped = Math.max(-SCALE_CP, Math.min(SCALE_CP, cp));
    return (HEIGHT / 2) * (1 - clamped / SCALE_CP);
  };

  // Recomputing ~100-point path strings on every scrub frame is waste.
  const { linePoints, areaPath } = useMemo(() => {
    const linePoints = evals
      .map((cp, i) => `${x(i).toFixed(1)},${y(cp).toFixed(1)}`)
      .join(" ");
    const areaPath = `M0,${y(0)} L${linePoints.replace(/ /g, " L")} L${x(n - 1)},${y(0)} Z`;
    return { linePoints, areaPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evals, width]);

  const seekFromEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width}
        height={HEIGHT}
        className="cursor-crosshair touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromEvent(e);
        }}
        onPointerMove={(e) => dragging.current && seekFromEvent(e)}
        onPointerUp={() => (dragging.current = false)}
      >
        {/* black-advantage backdrop above/below midline */}
        <rect x={0} y={0} width={width} height={HEIGHT} fill="var(--eval-area-black)" />
        <clipPath id="eval-white-clip">
          <path d={areaPath} />
        </clipPath>
        <rect
          x={0}
          y={0}
          width={width}
          height={HEIGHT}
          fill="var(--eval-area-white)"
          clipPath="url(#eval-white-clip)"
        />
        {[300, -300].map((cp) => (
          <line
            key={cp}
            x1={0}
            y1={y(cp)}
            x2={width}
            y2={y(cp)}
            stroke="var(--graph-guide)"
            strokeWidth={1}
          />
        ))}
        <line
          x1={0}
          y1={y(0)}
          x2={width}
          y2={y(0)}
          stroke="var(--graph-midline)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--eval-line)"
          strokeWidth={1.5}
        />
        {issues.map((issue) => (
          <circle
            key={issue.ply}
            cx={x(issue.ply)}
            cy={y(evals[issue.ply])}
            r={issue.severity === "blunder" ? 5 : 4}
            fill={SEVERITY_VAR[issue.severity]}
            stroke="var(--well-bg)"
            strokeWidth={1.5}
          />
        ))}
        <line
          x1={x(currentPly)}
          y1={0}
          x2={x(currentPly)}
          y2={HEIGHT}
          stroke="var(--graph-cursor)"
          strokeWidth={1}
        />
        <rect
          x={x(currentPly) - 3}
          y={y(evals[currentPly] ?? 0) - 3}
          width={6}
          height={6}
          fill="var(--accent)"
          transform={`rotate(45 ${x(currentPly)} ${y(evals[currentPly] ?? 0)})`}
        />
      </svg>
    </div>
  );
}
