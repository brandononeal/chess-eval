"use client";

import type { DayActivity } from "@/lib/coach/types";
import { localDateKey } from "@/lib/coach/ui-utils";
import { useEffect, useState } from "react";

interface ActivityHeatmapProps {
  timeClass: string;
}

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const DAY_LABELS: Array<[number, string]> = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
];
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function heatLevel(games: number): number {
  if (games === 0) return 0;
  if (games <= 4) return 1;
  if (games <= 9) return 2;
  if (games <= 19) return 3;
  return 4;
}

interface Cell {
  date: string;
  week: number;
  row: number;
  activity: DayActivity | null;
}

/** GitHub-style grid: columns are Sunday-started weeks, rows are weekdays. */
function buildGrid(days: DayActivity[], fromTime: number): Cell[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const start = new Date(fromTime * 1000);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  start.setHours(12, 0, 0, 0); // noon dodges DST edges

  const cells: Cell[] = [];
  const today = localDateKey(Date.now() / 1000);
  const cursor = new Date(start);
  for (let week = 0; ; week++) {
    for (let row = 0; row < 7; row++) {
      const date = localDateKey(cursor.getTime() / 1000);
      if (date > today) return cells;
      cells.push({ date, week, row, activity: byDate.get(date) ?? null });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
}

export function ActivityHeatmap({ timeClass }: ActivityHeatmapProps) {
  const [days, setDays] = useState<DayActivity[] | null>(null);
  const [fromTime, setFromTime] = useState(0);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<Cell | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setDays(null);
    fetch(`/api/coach/activity?days=365&tc=${timeClass}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = await res.json();
        setFromTime(body.fromTime);
        setDays(body.days);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [timeClass]);

  if (error) return null;
  if (!days) {
    return (
      <p className="text-sm text-ink-faint">Loading a year of games…</p>
    );
  }

  const cells = buildGrid(days, fromTime);
  const weeks = cells.length ? cells[cells.length - 1].week + 1 : 0;
  const width = weeks * STEP;
  const total = days.reduce((n, d) => n + d.games, 0);

  // First week of each month gets a label.
  const monthLabels: Array<{ week: number; label: string }> = [];
  let lastMonth = "";
  for (const cell of cells) {
    if (cell.row !== 0) continue;
    const month = cell.date.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      monthLabels.push({
        week: cell.week,
        label: MONTHS[Number(cell.date.slice(5, 7)) - 1],
      });
    }
  }

  return (
    <div className="relative min-w-0 max-w-full">
      <div className="overflow-x-auto pb-1">
        <svg
          width={width + 30}
          height={7 * STEP + 16}
          className="block"
          onMouseLeave={() => setHover(null)}
        >
          {monthLabels.map(({ week, label }) => (
            <text
              key={`${week}-${label}`}
              x={30 + week * STEP}
              y={9}
              className="fill-[color:var(--text-faint)] font-sans text-[9px]"
            >
              {label}
            </text>
          ))}
          {DAY_LABELS.map(([row, label]) => (
            <text
              key={label}
              x={0}
              y={16 + row * STEP + CELL - 2}
              className="fill-[color:var(--text-faint)] font-sans text-[9px]"
            >
              {label}
            </text>
          ))}
          {cells.map((cell) => (
            <rect
              key={cell.date}
              x={30 + cell.week * STEP}
              y={16 + cell.row * STEP}
              width={CELL}
              height={CELL}
              rx={2}
              fill={`var(--heat-${heatLevel(cell.activity?.games ?? 0)})`}
              stroke={hover?.date === cell.date ? "var(--accent)" : "none"}
              strokeWidth={1}
              onMouseEnter={() => setHover(cell)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
        <span className="font-mono">
          {hover
            ? `${hover.date} · ${hover.activity?.games ?? 0} games${
                hover.activity
                  ? ` · ${hover.activity.wins}–${hover.activity.losses}–${hover.activity.draws}`
                  : ""
              }`
            : `${total} games in the last year`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              className="inline-block h-[10px] w-[10px] rounded-[2px]"
              style={{ background: `var(--heat-${lvl})` }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
