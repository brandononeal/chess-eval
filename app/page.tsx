"use client";

import { computeGrade, nextLevelPlan } from "@/lib/coach/grade";
import {
  CLOCK_BUCKET_LABELS,
  STUDY_FOCI,
  TIME_CLASSES,
  type GameAnalysis,
  type IssueSeverity,
  type StudyFocus,
  type TimePressureSummary,
  type WeeklyReport,
} from "@/lib/coach/types";
import {
  RESULT_GLYPH,
  RESULT_VAR,
  SEVERITY_GLYPH,
  SEVERITY_TEXT,
  colorName,
  errorRate,
  formatClock,
  formatDate,
  formatEval,
  scoreOf,
  winRate,
} from "@/lib/coach/ui-utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ActivityHeatmap } from "./components/ActivityHeatmap";
import { DrillCard } from "./components/DrillCard";
import { GameReplay } from "./components/GameReplay";
import { Sparkline } from "./components/Sparkline";

const RANGES = [7, 30, 90] as const;
const TC_FILTERS = ["all", ...TIME_CLASSES] as const;

const GRADE_COLORS: Record<string, string> = {
  A: "text-brass",
  B: "text-brass",
  C: "text-draw",
  D: "text-mistake",
  F: "text-blunder",
};
const gradeColor = (letter: string) =>
  GRADE_COLORS[letter[0]] ?? "text-blunder";

interface ReplayTarget {
  analysis: GameAnalysis;
  initialPly?: number;
}

function SeverityBadge({
  severity,
  children,
}: {
  severity: IssueSeverity;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`rounded px-1.5 font-mono text-xs ${SEVERITY_TEXT[severity]}`}
      style={{ background: `var(--severity-${severity}-tint)` }}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="double-rule font-display text-lg font-semibold">
        <span className="mr-2 font-mono text-sm font-normal text-ink-faint">
          ⅓
        </span>
        {title}
        {detail && (
          <span className="ml-3 font-sans text-xs font-normal text-ink-faint">
            {detail}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function TimePressureCard({ tp }: { tp: TimePressureSummary }) {
  if (!tp.hasClockData) return null;
  return (
    <div className="card px-6 py-4">
      <div className="kicker mb-2">Blunders by clock</div>
      <table className="font-mono text-xs leading-5">
        <tbody>
          {CLOCK_BUCKET_LABELS.map(([key, label]) => {
            const b = tp.buckets[key];
            const rate = errorRate(b);
            return (
              <tr key={key}>
                <td className="pr-4 font-sans text-ink-soft">{label}</td>
                <td className="pr-4 text-right">
                  {b.blunders + b.mistakes}/{b.moves}
                </td>
                <td
                  className={`text-right ${
                    rate >= 0.2
                      ? "text-blunder"
                      : rate >= 0.1
                        ? "text-mistake"
                        : "text-ink-faint"
                  }`}
                >
                  {b.moves > 0 ? `${(rate * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tp.lostOnTime > 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          Flagged {tp.lostOnTime}× — {tp.lostOnTimeWhileWinning} while winning.
        </p>
      )}
    </div>
  );
}

function StatCard({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="card px-6 py-4">
      <div className="font-display text-[34px] font-semibold leading-tight">
        {value}
      </div>
      <div className="kicker mt-1">{label}</div>
    </div>
  );
}

function TallyValue({
  wins,
  losses,
  draws,
}: {
  wins: number;
  losses: number;
  draws: number;
}) {
  return (
    <span className="font-mono">
      {wins}
      <span className="text-ink-faint">–</span>
      {losses}
      <span className="text-ink-faint">–</span>
      {draws}
    </span>
  );
}

function GameRow({
  analysis,
  analyzed,
  onReplay,
}: {
  analysis: GameAnalysis;
  analyzed: boolean;
  onReplay: (target: ReplayTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { game, issues, counts, acpl, repertoire } = analysis;
  const railColor = RESULT_VAR[game.result];

  return (
    <div
      className="border-b border-[color:var(--ledger-divider)]"
      style={{ borderLeft: `3px solid ${railColor}` }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm transition-colors hover:bg-surface"
      >
        <span className="w-12 font-mono text-xs text-ink-faint">
          {formatDate(game.endTime)}
        </span>
        <span
          className="w-5 font-display text-base font-semibold"
          style={{ color: railColor }}
        >
          {RESULT_GLYPH[game.result]}
        </span>
        <span className="w-14 text-ink-faint">{colorName(game.userColor)}</span>
        <span className="min-w-32 flex-1 font-medium">
          {game.opponent}
          <span className="ml-1 font-mono text-xs font-normal text-ink-faint">
            {game.opponentRating}
          </span>
        </span>
        <span className="hidden flex-1 truncate font-display text-[13px] italic text-ink-soft sm:block">
          {game.openingName}
        </span>
        {analyzed && (
          <span className="text-xs text-brass" title="Analyzed in replay">
            ✓
          </span>
        )}
        <span className="font-mono text-xs text-ink-soft">
          ACPL {acpl}
        </span>
        <span className="flex gap-1">
          {counts.blunder > 0 && (
            <SeverityBadge severity="blunder">{counts.blunder}??</SeverityBadge>
          )}
          {counts.mistake > 0 && (
            <SeverityBadge severity="mistake">{counts.mistake}?</SeverityBadge>
          )}
        </span>
      </button>

      {expanded && (
        <div className="bg-[color:var(--ledger-inset)] px-4 py-3 text-sm">
          <p className="mb-2 flex flex-wrap items-center gap-x-3 text-ink-soft">
            <button
              onClick={() => onReplay({ analysis })}
              className="rounded-lg border border-line px-3 py-0.5 text-xs hover:bg-raised"
            >
              ▶ Replay game
            </button>
            <span>
              {repertoire.inRepertoire === true && (
                <span className="text-win">✓ </span>
              )}
              {repertoire.inRepertoire === false && (
                <span className="text-loss">✗ </span>
              )}
              {repertoire.note}
            </span>
            <a
              href={game.url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-faint hover:text-brass hover:underline"
            >
              chess.com ↗
            </a>
          </p>
          {issues.length === 0 ? (
            <p className="text-ink-faint">No notable errors — clean game.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {issues.map((issue) => (
                <li key={issue.ply}>
                  <button
                    onClick={() =>
                      onReplay({ analysis, initialPly: issue.ply - 1 })
                    }
                    className="flex flex-wrap items-center gap-2 rounded px-1 py-0.5 font-mono text-[13px] hover:bg-raised"
                  >
                    <SeverityBadge severity={issue.severity}>
                      {issue.severity}
                    </SeverityBadge>
                    <span>
                      {issue.moveNumber}. {issue.san}
                      <span className={SEVERITY_TEXT[issue.severity]}>
                        {SEVERITY_GLYPH[issue.severity]}
                      </span>
                    </span>
                    <span className="text-ink-faint">
                      {formatEval(issue.evalBefore)} →{" "}
                      {formatEval(issue.evalAfter)} · best{" "}
                      {issue.bestMoveSan || "?"}
                      {issue.clockSeconds !== undefined &&
                        ` · ${formatClock(issue.clockSeconds)} on clock`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Coach() {
  const [days, setDays] = useState<number>(7);
  const [tc, setTc] = useState<(typeof TC_FILTERS)[number]>("all");
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState<ReplayTarget | null>(null);
  const [progressText, setProgressText] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");

  // localStorage isn't available during SSR, so seed after mount.
  useEffect(() => {
    const saved = localStorage.getItem("coach:username");
    if (saved) {
      setUsername(saved);
      setUsernameInput(saved);
    }
  }, []);

  // When no username is chosen, show the server's default in the field.
  useEffect(() => {
    if (username === null && report?.username) setUsernameInput(report.username);
  }, [report?.username, username]);

  const submitUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const next = usernameInput.trim();
    if (next) {
      localStorage.setItem("coach:username", next);
      setUsername(next);
    } else {
      localStorage.removeItem("coach:username");
      setUsername(null);
    }
  };

  const logStudy = async (focus: StudyFocus, minutes: number) => {
    await fetch("/api/coach/study-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focus, minutes }),
    }).catch(() => {});
    setRefreshNonce((n) => n + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ days: String(days), tc });
    if (username) qs.set("username", username);
    fetch(`/api/coach/report?${qs.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setReport(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        // An aborted request must not clear the loading state its
        // replacement just set (Strict Mode double-invoke, range switches).
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [days, tc, refreshNonce, username]);

  useEffect(() => {
    if (!loading) {
      setProgressText("");
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/coach/progress");
        const p = await res.json();
        if (p.phase === "analyzing" && p.total > 0) {
          setProgressText(`Analyzing game ${p.current}/${p.total}…`);
        } else if (p.phase === "fetching") {
          setProgressText("Fetching games from Chess.com…");
        }
      } catch {
        // keep last text
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const grade = report ? computeGrade(report) : null;
  const plan = report ? nextLevelPlan(report) : null;
  const rangeLabel = report
    ? `${formatDate(report.fromTime)} – ${formatDate(report.toTime)}`.toUpperCase()
    : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-12 px-4 py-10">
      <header className="double-rule pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="kicker">
            Week in review{tc !== "all" ? ` · ${tc}` : ""} · {rangeLabel}
            {report ? ` · ${report.totals.games} games` : ""}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TC_FILTERS.map((c) => (
              <button
                key={c}
                onClick={() => setTc(c)}
                className={`rounded-lg px-2.5 py-1 text-xs capitalize transition-colors ${
                  tc === c
                    ? "bg-brass font-semibold text-brass-contrast"
                    : "border border-line text-ink-soft hover:bg-raised"
                }`}
              >
                {c}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-line" />
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                  days === r
                    ? "bg-brass font-semibold text-brass-contrast"
                    : "border border-line hover:bg-raised"
                }`}
              >
                {r}d
              </button>
            ))}
            <Link
              href="/board"
              className="ml-2 text-sm text-ink-faint hover:text-brass hover:underline"
            >
              Board →
            </Link>
          </div>
        </div>

        <form onSubmit={submitUsername} className="mt-3 flex items-center gap-2">
          <span className="kicker">Player</span>
          <input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder={report?.username ?? "chess.com username"}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Chess.com username"
            className="w-48 rounded-lg border border-line bg-transparent px-2.5 py-1 font-mono text-xs outline-none transition-colors focus:border-brass"
          />
          <button
            type="submit"
            className="rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-raised"
          >
            Load
          </button>
        </form>

        {grade && !loading && (
          <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2">
            <div
              className={`font-display font-black leading-[0.85] ${gradeColor(grade.letter)}`}
              style={{
                fontSize: "clamp(96px, 14vw, 144px)",
                textShadow:
                  "0 1px 0 rgba(0,0,0,0.5), 0 0 40px rgba(201,164,92,0.15)",
              }}
            >
              {grade.letter}
            </div>
            <p className="max-w-[44ch] text-[15px] leading-relaxed text-ink-soft">
              {grade.note}
            </p>
          </div>
        )}
        {(!grade || loading) && (
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Chess Coach
          </h1>
        )}

        {plan && !loading && (
          <div className="mt-6">
            <div className="kicker mb-2">
              The path to <span className="text-brass">{plan.target}</span> ·
              currently <span className="font-mono">{plan.current}</span>
              {report?.ratingSeriesClass ? ` ${report.ratingSeriesClass}` : ""}
            </div>
            <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-3">
              {plan.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
                  <span className="font-display text-brass">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {report && !loading && (
          <div className="mt-5">
            <div className="kicker mb-1">This week&apos;s thirds</div>
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-ink-soft">
              <span>
                Tactics ·{" "}
                <span className="font-mono">
                  {report.thirds.drillAttempts}
                </span>{" "}
                drill attempts
              </span>
              <span>
                Play &amp; Analyze ·{" "}
                <span className="font-mono">{report.totals.games}</span> played
                /{" "}
                <span className="font-mono">
                  {report.thirds.analyzedUrls.length}
                </span>{" "}
                analyzed
              </span>
              <span>
                Study ·{" "}
                <span className="font-mono">
                  {report.thirds.studySessions}
                </span>{" "}
                {report.thirds.studySessions === 1 ? "session" : "sessions"}
                {report.thirds.studyMinutes > 0 && (
                  <span className="font-mono">
                    {" "}
                    ({report.thirds.studyMinutes}m)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-faint">
          {report ? `${report.username} · ` : ""}the one-third rule: Tactics ·
          Play &amp; Analyze · Study
        </p>
      </header>

      {loading && (
        <div className="flex flex-col items-center gap-2 py-20 text-ink-soft">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brass" />
          <p>{progressText || "Fetching games and running Stockfish…"}</p>
          <p className="text-xs text-ink-faint">
            New games are analyzed once, then cached.
          </p>
        </div>
      )}

      {error && (
        <p className="card border-loss p-4 text-loss">{error}</p>
      )}

      {report && !loading && (
        <>
          <Section title="Tactics" detail="drills built from your own mistakes">
            {report.drills.length === 0 ? (
              <p className="text-ink-soft">
                No blunders big enough to drill — nice week.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {report.drills.map((drill, i) => (
                  <DrillCard key={drill.id} drill={drill} index={i} />
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Play & Analyze"
            detail="games only count if you really analyze them"
          >
            {report.totals.games === 0 ? (
              <p className="text-ink-soft">
                No games in the last {days} days. The loop starts with Play.
              </p>
            ) : (
              <div className="flex flex-wrap gap-4">
                <StatCard
                  value={<TallyValue {...report.totals} />}
                  label={`W–L–D · ${winRate(
                    report.totals.wins,
                    report.totals.draws,
                    report.totals.games,
                  )} score`}
                />
                {report.timeClassFilter === "all" &&
                  Object.keys(report.byTimeClass).length > 1 &&
                  Object.entries(report.byTimeClass).map(([cls, tally]) => (
                    <StatCard
                      key={cls}
                      value={<TallyValue {...tally} />}
                      label={cls}
                    />
                  ))}
                <TimePressureCard tp={report.timePressure} />
              </div>
            )}
            <div className="card px-6 py-4">
              <div className="kicker mb-2">
                Daily games{tc !== "all" ? ` · ${tc}` : ""}
              </div>
              <ActivityHeatmap timeClass={tc} username={username} />
            </div>
            {report.ratingSeries.length >= 2 && (
              <div className="card flex flex-wrap gap-10 px-6 py-4">
                <div>
                  <div className="kicker mb-2">
                    Rating{report.ratingSeriesClass ? ` · ${report.ratingSeriesClass}` : ""} ·{" "}
                    {report.ratingSeries.length} games
                  </div>
                  <Sparkline values={report.ratingSeries.map((p) => p.rating)} />
                </div>
                {report.daily.length >= 2 && (
                  <div className="min-w-0 max-w-full">
                    <div className="kicker mb-2">By day</div>
                    <div className="overflow-x-auto">
                    <table className="font-mono text-xs leading-5">
                      <tbody>
                        <tr className="text-ink-faint">
                          <td className="pr-3 font-sans" />
                          {report.daily.map((d) => (
                            <td key={d.date} className="pr-3 text-right">
                              {d.date.slice(5)}
                            </td>
                          ))}
                        </tr>
                        {(
                          [
                            ["Games", (d) => d.games],
                            ["ACPL", (d) => d.acpl],
                            ["Blunders", (d) => d.blunders],
                          ] as Array<
                            [string, (d: (typeof report.daily)[number]) => number]
                          >
                        ).map(([label, value]) => (
                          <tr key={label}>
                            <td className="pr-3 font-sans text-ink-faint">
                              {label}
                            </td>
                            {report.daily.map((d) => (
                              <td key={d.date} className="pr-3 text-right">
                                {value(d)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            {report.skippedGames > 0 && (
              <p className="text-xs text-ink-faint">
                Showing the {report.games.length} most recent games (
                {report.skippedGames} older games in range not analyzed).
              </p>
            )}
            <p className="text-sm text-ink-soft">
              Analyzed{" "}
              <span className="font-mono">
                {report.thirds.analyzedUrls.length}
              </span>{" "}
              of <span className="font-mono">{report.totals.games}</span> games
              — step through a game in the replay to mark it{" "}
              <span className="text-brass">✓</span>.
            </p>
            <div className="border-t border-[color:var(--ledger-divider)]">
              {report.games.map((analysis) => (
                <GameRow
                  key={analysis.game.url}
                  analysis={analysis}
                  analyzed={report.thirds.analyzedUrls.includes(
                    analysis.game.url,
                  )}
                  onReplay={setReplay}
                />
              ))}
            </div>
          </Section>

          <Section
            title="Study"
            detail="one specialization at a time — weakest first"
          >
            {report.phases.recommendation && (
              <div className="card px-6 py-4">
                <div className="kicker mb-1">Your third</div>
                <div className="font-display text-xl font-semibold text-brass">
                  {report.phases.recommendation.focus}
                </div>
                <p className="mt-1 max-w-[70ch] text-sm text-ink-soft">
                  {report.phases.recommendation.reason}
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-faint">Log a study session:</span>
              {STUDY_FOCI.map((focus) => (
                <button
                  key={focus}
                  onClick={() => logStudy(focus, 15)}
                  className={`rounded-lg border px-3 py-1 transition-colors hover:bg-raised ${
                    report.phases.recommendation?.focus === focus
                      ? "border-brass text-brass"
                      : "border-line"
                  }`}
                >
                  +15m {focus}
                </button>
              ))}
            </div>
            {report.openings.length === 0 ? (
              <p className="text-ink-soft">No opening data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="kicker">
                      <th className="pb-2 pr-4 font-semibold">Opening</th>
                      <th className="pb-2 pr-4 font-semibold">As</th>
                      <th className="pb-2 pr-4 text-right font-semibold">
                        Games
                      </th>
                      <th className="pb-2 pr-4 text-right font-semibold">
                        Score
                      </th>
                      <th className="pb-2 font-semibold">Repertoire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.openings.map((o) => {
                      const score = scoreOf(o);
                      return (
                        <tr
                          key={`${o.color}:${o.name}`}
                          className="border-t border-[color:var(--ledger-divider)] transition-colors hover:bg-surface"
                        >
                          <td className="py-2 pr-4 font-display italic text-ink-soft">
                            {o.name}
                          </td>
                          <td className="py-2 pr-4">{colorName(o.color)}</td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {o.games}
                          </td>
                          <td
                            className={`py-2 pr-4 text-right font-mono ${
                              score >= 0.6
                                ? "text-win"
                                : score <= 0.4
                                  ? "text-loss"
                                  : ""
                            }`}
                          >
                            {winRate(o.wins, o.draws, o.games)}
                          </td>
                          <td className="py-2">
                            {o.inRepertoire === true && (
                              <span className="font-medium text-win">
                                ✓ in book
                              </span>
                            )}
                            {o.inRepertoire === false && (
                              <span className="font-medium text-loss">
                                ✗ off book
                              </span>
                            )}
                            {o.inRepertoire === null && (
                              <span className="text-ink-faint">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}

      {replay && (
        <GameReplay
          key={`${replay.analysis.game.url}#${replay.initialPly ?? 0}`}
          analysis={replay.analysis}
          initialPly={replay.initialPly}
          onClose={() => {
            setReplay(null);
            // Refresh so a newly-analyzed game gets its ✓ immediately.
            setRefreshNonce((n) => n + 1);
          }}
        />
      )}
    </main>
  );
}
