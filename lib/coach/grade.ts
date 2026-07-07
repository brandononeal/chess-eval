import type { OpeningSummary, WeeklyReport } from "./types";
import { errorRate, scoreOf, winRate } from "./ui-utils";

export interface WeekGrade {
  letter: string;
  gpa: number;
  note: string;
}

const LETTERS: Array<[number, string]> = [
  [4.0, "A"],
  [3.7, "A-"],
  [3.3, "B+"],
  [3.0, "B"],
  [2.7, "B-"],
  [2.3, "C+"],
  [2.0, "C"],
  [1.7, "C-"],
  [1.3, "D+"],
  [1.0, "D"],
];

function acplPoints(acpl: number): number {
  if (acpl <= 40) return 4.0;
  if (acpl <= 55) return 3.3;
  if (acpl <= 70) return 2.7;
  if (acpl <= 85) return 2.0;
  if (acpl <= 100) return 1.3;
  return 0.7;
}

function letterFor(gpa: number): string {
  for (const [floor, letter] of LETTERS) {
    if (gpa >= floor) return letter;
  }
  return "F";
}

// One definition each of "leaking" and "carrying" openings — the hero note
// and the next-level plan must never cite contradictory openings.
const findLeak = (openings: OpeningSummary[]) =>
  openings.find(
    (o) => o.inRepertoire === false && o.games >= 3 && scoreOf(o) < 0.4,
  );

const findCarry = (openings: OpeningSummary[]) =>
  openings.find(
    (o) => o.inRepertoire === true && o.games >= 3 && scoreOf(o) >= 0.6,
  );

const totalBlunders = (report: WeeklyReport) =>
  report.games.reduce((n, g) => n + g.counts.blunder, 0);

function coachNote(report: WeeklyReport, avgAcpl: number): string {
  const { timePressure: tp, totals, daily, openings } = report;

  if (tp.lostOnTimeWhileWinning > 0) {
    return `You lost ${tp.lostOnTimeWhileWinning} winning ${
      tp.lostOnTimeWhileWinning === 1 ? "position" : "positions"
    } on the clock — convert faster, premove the endings.`;
  }

  const calm = errorRate(tp.buckets.over30);
  const rushed = errorRate(tp.buckets.s10to30);
  if (
    tp.hasClockData &&
    tp.buckets.s10to30.moves >= 40 &&
    calm > 0 &&
    rushed >= calm * 1.8
  ) {
    return `Your error rate ${
      rushed >= calm * 2.5 ? "explodes" : "doubles"
    } under 30 seconds (${(calm * 100).toFixed(0)}% → ${(rushed * 100).toFixed(
      0,
    )}%) — bank time earlier in the game.`;
  }

  if (daily.length >= 3) {
    const first = daily[0].acpl;
    const last = daily[daily.length - 1].acpl;
    if (first - last >= 15) {
      return `Accuracy climbed all week — ACPL ${first} down to ${last}. Whatever changed, keep it.`;
    }
  }

  const leak = findLeak(openings);
  if (leak) {
    return `${leak.name} is bleeding points (${leak.wins}-${leak.losses}-${leak.draws}) and it isn't in your book — study it or steer away.`;
  }

  const carry = findCarry(openings);
  if (carry) {
    return `The ${carry.name} is carrying you: ${carry.wins}-${carry.losses}-${carry.draws}. Play it more.`;
  }

  return `${totalBlunders(report)} blunders across ${totals.games} games (ACPL ${avgAcpl}) — your worst moments are waiting in Puzzles.`;
}

export interface LevelPlan {
  current: number;
  target: number;
  tips: string[];
}

/**
 * The top rating levers in this report's data, ranked by expected impact.
 * Rule-based on purpose: every tip cites the user's own numbers.
 */
export function nextLevelPlan(report: WeeklyReport): LevelPlan | null {
  const { ratingSeries, timePressure: tp, openings, games } = report;
  if (ratingSeries.length === 0 || games.length === 0) return null;

  const current = ratingSeries[ratingSeries.length - 1].rating;
  const target = Math.floor(current / 100) * 100 + 100;
  const tips: string[] = [];

  const calm = errorRate(tp.buckets.over30);
  const rushedMoves = tp.buckets.s10to30.moves + tp.buckets.under10.moves;
  const rushedErrors =
    tp.buckets.s10to30.blunders +
    tp.buckets.s10to30.mistakes +
    tp.buckets.under10.blunders +
    tp.buckets.under10.mistakes;
  const rushed = rushedMoves > 0 ? rushedErrors / rushedMoves : 0;
  if (tp.hasClockData && rushedMoves >= 30 && calm > 0 && rushed >= calm * 1.5) {
    tips.push(
      `Bank clock early: you err on ${(calm * 100).toFixed(0)}% of moves with time but ${(rushed * 100).toFixed(0)}% under 30 seconds. A slightly worse move played faster is the better bullet move.`,
    );
  }

  if (tp.lostOnTime >= 3) {
    tips.push(
      `${tp.lostOnTime} losses were flags${
        tp.lostOnTimeWhileWinning > 0
          ? ` (${tp.lostOnTimeWhileWinning} from winning positions)`
          : ""
      } — premove recaptures and king moves once the position is decided.`,
    );
  }

  const bpg = totalBlunders(report) / games.length;
  if (bpg >= 1.5) {
    tips.push(
      `You average ${bpg.toFixed(1)} blunders per game. Cutting that to one is worth more than any opening study — the Puzzles below are built from exactly those moments.`,
    );
  }

  const leak = findLeak(openings);
  if (leak) {
    tips.push(
      `You're ${leak.wins}–${leak.losses}–${leak.draws} in the ${leak.name} and it isn't in your book — pick one reply and drill it until it's automatic.`,
    );
  }

  const carry = findCarry(openings);
  if (carry) {
    tips.push(
      `The ${carry.name} scores ${winRate(carry.wins, carry.draws, carry.games)} for you — steer more games into it and fewer into sidelines.`,
    );
  }

  if (tips.length === 0) {
    tips.push(
      `No single leak stands out — grind the drills below and keep the ACPL trend pointed down.`,
    );
  }

  return { current, target, tips: tips.slice(0, 3) };
}

export function computeGrade(report: WeeklyReport): WeekGrade | null {
  const { games, totals } = report;
  if (games.length === 0) return null;

  const avgAcpl = Math.round(
    games.reduce((sum, g) => sum + g.acpl, 0) / games.length,
  );
  const blundersPerGame = totalBlunders(report) / games.length;
  const score = scoreOf({
    wins: totals.wins,
    draws: totals.draws,
    games: totals.games,
  });

  let gpa = acplPoints(avgAcpl);
  if (blundersPerGame <= 0.8) gpa += 0.3;
  if (blundersPerGame >= 2.5) gpa -= 0.3;
  if (score >= 0.55) gpa += 0.3;
  if (score <= 0.4) gpa -= 0.3;
  gpa = Math.max(0, Math.min(4.3, gpa));

  return {
    letter: gpa > 4.0 ? "A+" : letterFor(gpa),
    gpa: Math.round(gpa * 10) / 10,
    note: coachNote(report, avgAcpl),
  };
}
