import { Chess } from "chess.js";
import { NativeEngine, uciToSan } from "./engine";
import { checkRepertoire } from "./repertoire";
import type {
  BucketTally,
  ClockBucket,
  CoachGame,
  DailyPoint,
  Drill,
  DrillRecord,
  GameAnalysis,
  GamePhase,
  IssueSeverity,
  MoveIssue,
  OpeningSummary,
  PhaseSummary,
  RatingPoint,
  ResultTally,
  StudyFocus,
  StudyLogEntry,
  ThirdsActivity,
  TimePressureSummary,
  WeeklyReport,
} from "./types";
import { errorRate, localDateKey } from "./ui-utils";

const EVAL_CLAMP = 1000;
const DECIDED_THRESHOLD = 800; // skip issue-flagging in already-decided positions
const THRESHOLDS: Array<[IssueSeverity, number]> = [
  ["blunder", 300],
  ["mistake", 150],
  ["inaccuracy", 75],
];
const MAX_DRILLS = 6;

const clamp = (cp: number) =>
  Math.max(-EVAL_CLAMP, Math.min(EVAL_CLAMP, cp));

function severityFor(swing: number): IssueSeverity | null {
  for (const [severity, threshold] of THRESHOLDS) {
    if (swing >= threshold) return severity;
  }
  return null;
}

export function bucketFor(clockSeconds: number): ClockBucket {
  if (clockSeconds < 10) return "under10";
  if (clockSeconds <= 30) return "s10to30";
  return "over30";
}

const OPENING_MAX_PLY = 16; // through move 8
const ENDGAME_MAX_PIECES = 12; // kings included

/**
 * Simple phase heuristic: few pieces = endgame regardless of move number;
 * otherwise the first 8 moves are the opening.
 */
export function phaseFor(ply: number, fen: string): GamePhase {
  const pieces = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
  if (pieces <= ENDGAME_MAX_PIECES) return "endgame";
  if (ply <= OPENING_MAX_PLY) return "opening";
  return "middlegame";
}

const PHASES = ["opening", "middlegame", "endgame"] as const;
const CLOCK_BUCKETS = ["over30", "s10to30", "under10"] as const;

function emptyTallies<K extends string>(
  keys: readonly K[],
): Record<K, BucketTally> {
  return Object.fromEntries(
    keys.map((k) => [k, { moves: 0, blunders: 0, mistakes: 0 }]),
  ) as Record<K, BucketTally>;
}

function tallyMove(t: BucketTally, severity: IssueSeverity | null): void {
  t.moves++;
  if (severity === "blunder") t.blunders++;
  else if (severity === "mistake") t.mistakes++;
}

function addTallies<K extends string>(
  dst: Record<K, BucketTally>,
  src: Record<K, BucketTally>,
  keys: readonly K[],
): void {
  for (const key of keys) {
    dst[key].moves += src[key].moves;
    dst[key].blunders += src[key].blunders;
    dst[key].mistakes += src[key].mistakes;
  }
}

/**
 * The user's clock entering the move at `ply` is the clock recorded after
 * their previous move (opponent think time doesn't drain it).
 */
function clockEnteringMove(game: CoachGame, ply: number): number | undefined {
  if (!game.clocks) return undefined;
  if (ply >= 2) return game.clocks[ply - 2];
  return game.baseSeconds || undefined;
}

export async function analyzeGame(
  game: CoachGame,
  engine: NativeEngine,
  depth: number,
): Promise<GameAnalysis> {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  for (const san of game.sans) {
    chess.move(san);
    fens.push(chess.fen());
  }

  const evals: number[] = [];
  const bestMoves: string[] = [];
  for (const fen of fens) {
    const { cp, bestMoveUci } = await engine.evaluate(fen, depth);
    evals.push(clamp(cp));
    bestMoves.push(bestMoveUci);
  }

  const issues: MoveIssue[] = [];
  const clockBuckets = game.clocks ? emptyTallies(CLOCK_BUCKETS) : undefined;
  const phaseTallies = emptyTallies(PHASES);
  let totalLoss = 0;
  let userMoveCount = 0;

  for (let ply = 0; ply < game.sans.length; ply++) {
    const isWhiteMove = ply % 2 === 0;
    if ((game.userColor === "w") !== isWhiteMove) continue;

    const evalBefore = evals[ply];
    const evalAfter = evals[ply + 1];
    const loss =
      game.userColor === "w" ? evalBefore - evalAfter : evalAfter - evalBefore;

    userMoveCount++;
    totalLoss += Math.max(0, loss);

    const clockSeconds = clockEnteringMove(game, ply);
    const phase = phaseFor(ply + 1, fens[ply]);
    if (Math.abs(evalBefore) >= DECIDED_THRESHOLD) continue;
    const severity = severityFor(loss);

    if (clockBuckets && clockSeconds !== undefined) {
      tallyMove(clockBuckets[bucketFor(clockSeconds)], severity);
    }
    tallyMove(phaseTallies[phase], severity);

    if (!severity) continue;

    issues.push({
      ply: ply + 1,
      moveNumber: Math.floor(ply / 2) + 1,
      san: game.sans[ply],
      severity,
      evalBefore,
      evalAfter,
      swing: loss,
      fenBefore: fens[ply],
      bestMoveSan: uciToSan(fens[ply], bestMoves[ply]),
      clockSeconds,
      phase,
    });
  }

  const counts: Record<IssueSeverity, number> = {
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  for (const issue of issues) counts[issue.severity]++;

  const lostOnTime = game.userResultRaw === "timeout";
  const finalEval = evals[evals.length - 1];
  const finalEdge = game.userColor === "w" ? finalEval : -finalEval;

  return {
    game,
    issues,
    counts,
    acpl: userMoveCount > 0 ? Math.round(totalLoss / userMoveCount) : 0,
    repertoire: checkRepertoire(game.sans, game.userColor),
    clockBuckets,
    phaseTallies,
    lostOnTime,
    lostOnTimeWhileWinning: lostOnTime && finalEdge >= 150,
    evals,
  };
}

const PHASE_TO_FOCUS: Record<GamePhase, StudyFocus> = {
  opening: "Openings",
  endgame: "Endgames",
  middlegame: "Positional Chess",
};

const MIN_PHASE_MOVES = 50;

/**
 * The one-third rule says the study third should target the weakest area.
 * Recommend the specialization for the phase with the worst error rate.
 */
export function buildPhaseSummary(analyses: GameAnalysis[]): PhaseSummary {
  const tallies = emptyTallies(PHASES);
  for (const a of analyses) {
    if (!a.phaseTallies) continue; // tolerate pre-v4 cache entries
    addTallies(tallies, a.phaseTallies, PHASES);
  }

  const rated = PHASES.filter((p) => tallies[p].moves >= MIN_PHASE_MOVES).sort(
    (a, b) => errorRate(tallies[b]) - errorRate(tallies[a]),
  );

  const worst = rated[0];
  if (!worst || errorRate(tallies[worst]) === 0) {
    return { recommendation: null };
  }

  const rate = (p: GamePhase) => `${(errorRate(tallies[p]) * 100).toFixed(1)}%`;
  const best = rated[rated.length - 1];
  // With a single qualifying phase there is nothing to compare against.
  const comparison = best !== worst ? ` (vs ${rate(best)} in the ${best})` : "";
  return {
    recommendation: {
      focus: PHASE_TO_FOCUS[worst],
      reason: `Your ${worst} error rate is ${rate(worst)}${comparison} — the weakest phase across ${tallies[worst].moves} ${worst} moves.`,
    },
  };
}

function emptyTally(): ResultTally {
  return { games: 0, wins: 0, losses: 0, draws: 0 };
}

function addToTally(tally: ResultTally, result: CoachGame["result"]): void {
  tally.games++;
  if (result === "win") tally.wins++;
  else if (result === "loss") tally.losses++;
  else tally.draws++;
}

const MAX_REVIEW_DRILLS = 2;

function buildDrills(
  analyses: GameAnalysis[],
  history: Record<string, DrillRecord>,
): Drill[] {
  const fresh = analyses
    .flatMap(({ game, issues }) =>
      issues
        .filter((i) => i.severity !== "inaccuracy" && i.bestMoveSan)
        .map((i) => ({
          id: `${game.url}#${i.ply}`,
          gameUrl: game.url,
          opponent: game.opponent,
          fen: i.fenBefore,
          userColor: game.userColor,
          playedSan: i.san,
          bestMoveSan: i.bestMoveSan,
          swing: i.swing,
          evalBefore: i.evalBefore,
          moveNumber: i.moveNumber,
        })),
    )
    .filter((d) => !history[d.id]?.passed)
    .sort((a, b) => b.swing - a.swing)
    .slice(0, MAX_DRILLS);

  const freshIds = new Set(fresh.map((d) => d.id));
  const reviews = Object.values(history)
    .filter((r) => !r.passed && r.fails > 0 && !freshIds.has(r.drill.id))
    .sort((a, b) => b.fails - a.fails || b.updatedAt - a.updatedAt)
    .slice(0, MAX_REVIEW_DRILLS)
    .map((r) => ({ ...r.drill, isReview: true }));

  return [...reviews, ...fresh];
}

function buildTimePressure(analyses: GameAnalysis[]): TimePressureSummary {
  const buckets = emptyTallies(CLOCK_BUCKETS);
  let hasClockData = false;
  let lostOnTime = 0;
  let lostOnTimeWhileWinning = 0;

  for (const a of analyses) {
    if (a.lostOnTime) lostOnTime++;
    if (a.lostOnTimeWhileWinning) lostOnTimeWhileWinning++;
    if (!a.clockBuckets) continue;
    hasClockData = true;
    addTallies(buckets, a.clockBuckets, CLOCK_BUCKETS);
  }

  return { buckets, lostOnTime, lostOnTimeWhileWinning, hasClockData };
}

/**
 * Chess.com ratings are separate per time class, so a mixed series would
 * jump between unrelated scales. Chart only the dominant class's games.
 */
function buildRatingSeries(analyses: GameAnalysis[]): {
  series: RatingPoint[];
  cls: string | null;
} {
  if (analyses.length === 0) return { series: [], cls: null };
  const counts = new Map<string, number>();
  for (const { game } of analyses) {
    counts.set(game.timeClass, (counts.get(game.timeClass) ?? 0) + 1);
  }
  const cls = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const series = analyses
    .filter(({ game }) => game.timeClass === cls)
    .map(({ game }) => ({ t: game.endTime, rating: game.userRating }))
    .sort((a, b) => a.t - b.t);
  return { series, cls };
}

function buildDaily(analyses: GameAnalysis[]): DailyPoint[] {
  const byDate = new Map<
    string,
    { games: number; acplSum: number; blunders: number }
  >();
  for (const a of analyses) {
    const date = localDateKey(a.game.endTime);
    const entry = byDate.get(date) ?? { games: 0, acplSum: 0, blunders: 0 };
    entry.games++;
    entry.acplSum += a.acpl;
    entry.blunders += a.counts.blunder;
    byDate.set(date, entry);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, e]) => ({
      date,
      games: e.games,
      acpl: Math.round(e.acplSum / e.games),
      blunders: e.blunders,
    }));
}

const FAMILY_MARKERS = new Set([
  "Defense",
  "Game",
  "Opening",
  "Attack",
  "System",
  "Gambit",
]);

// "Sicilian Defense Nyezhmetdinov Rossolimo Fianchetto" → "Sicilian Defense"
function openingFamily(name: string): string {
  const words = name.split(" ");
  const idx = words.findIndex((w) => FAMILY_MARKERS.has(w));
  return idx >= 0
    ? words.slice(0, idx + 1).join(" ")
    : words.slice(0, 3).join(" ");
}

function buildOpenings(analyses: GameAnalysis[]): OpeningSummary[] {
  const map = new Map<string, OpeningSummary>();
  for (const { game, repertoire } of analyses) {
    const family = openingFamily(game.openingName);
    const key = `${game.userColor}:${family}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: family,
        color: game.userColor,
        inRepertoire: repertoire.inRepertoire,
        ...emptyTally(),
      };
      map.set(key, entry);
    }
    addToTally(entry, game.result);
    if (repertoire.inRepertoire === true) entry.inRepertoire = true;
    else if (repertoire.inRepertoire === false && entry.inRepertoire === null)
      entry.inRepertoire = false;
  }
  return [...map.values()].sort((a, b) => b.games - a.games);
}

function buildThirds(
  fromTime: number,
  toTime: number,
  analyses: GameAnalysis[],
  drillHistory: Record<string, DrillRecord>,
  analyzedGames: Record<string, number>,
  studyLog: StudyLogEntry[],
): ThirdsActivity {
  const inWindow = (t: number) => t >= fromTime && t <= toTime;

  const touched = Object.values(drillHistory).filter((r) =>
    inWindow(r.updatedAt),
  );
  const gameUrls = new Set(analyses.map((a) => a.game.url));
  const analyzedUrls = Object.entries(analyzedGames)
    .filter(([url, t]) => inWindow(t) && gameUrls.has(url))
    .map(([url]) => url);

  const sessions = studyLog.filter((e) => inWindow(e.t));

  return {
    // fails is a lifetime counter, so summing it would leak attempts from
    // outside the window; count drills attempted in the window instead.
    drillAttempts: touched.length,
    analyzedUrls,
    studySessions: sessions.length,
    studyMinutes: sessions.reduce((n, e) => n + e.minutes, 0),
  };
}

export function buildReport(
  username: string,
  fromTime: number,
  toTime: number,
  analyses: GameAnalysis[],
  skippedGames: number,
  drillHistory: Record<string, DrillRecord> = {},
  timeClassFilter = "all",
  analyzedGames: Record<string, number> = {},
  studyLog: StudyLogEntry[] = [],
): WeeklyReport {
  const totals = emptyTally();
  const byTimeClass: Record<string, ResultTally> = {};

  for (const { game } of analyses) {
    addToTally(totals, game.result);
    byTimeClass[game.timeClass] ??= emptyTally();
    addToTally(byTimeClass[game.timeClass], game.result);
  }

  const { series: ratingSeries, cls: ratingSeriesClass } =
    buildRatingSeries(analyses);

  return {
    username,
    fromTime,
    toTime,
    timeClassFilter,
    totals,
    byTimeClass,
    games: analyses,
    drills: buildDrills(analyses, drillHistory),
    openings: buildOpenings(analyses),
    skippedGames,
    timePressure: buildTimePressure(analyses),
    ratingSeries,
    ratingSeriesClass,
    daily: buildDaily(analyses),
    phases: buildPhaseSummary(analyses),
    thirds: buildThirds(
      fromTime,
      toTime,
      analyses,
      drillHistory,
      analyzedGames,
      studyLog,
    ),
  };
}
