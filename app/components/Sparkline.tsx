"use client";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 260, height = 60 }: SparklineProps) {
  if (values.length < 2) {
    return <p className="text-sm text-ink-faint">Not enough data to chart.</p>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex items-end gap-3">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--eval-line)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="font-mono text-xs text-ink-faint">
        <div>{max}</div>
        <div>{min}</div>
      </div>
    </div>
  );
}
