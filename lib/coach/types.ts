export type GameResult = "win" | "loss" | "draw";

export const TIME_CLASSES = ["bullet", "blitz", "rapid", "daily"] as const;

export interface CoachGame {
  url: string;
  endTime: number;
  timeClass: string;
  userColor: "w" | "b";
  opponent: string;
  opponentRating: number;
  userRating: number;
  result: GameResult;
  userResultRaw: string;
  openingName: string;
  sans: string[];
  /** Seconds remaining for the mover after each ply, from PGN %clk.
      Consumed during analysis; stripped from API responses. */
  clocks?: number[];
  baseSeconds: number;
}

export type IssueSeverity = "inaccuracy" | "mistake" | "blunder";

export interface MoveIssue {
  ply: number;
  moveNumber: number;
  san: string;
  severity: IssueSeverity;
  evalBefore: number;
  evalAfter: number;
  swing: number;
  fenBefore: string;
  bestMoveSan: string;
  /** User's clock (seconds) when this move was made, if known. */
  clockSeconds?: number;
  phase: GamePhase;
}

export type ClockBucket = "over30" | "s10to30" | "under10";

// Display labels for the thresholds in analyze.ts's bucketFor — kept here
// (dependency-free module) so client code can import them without pulling
// the server-only engine wrapper into the bundle.
export const CLOCK_BUCKET_LABELS: Array<[ClockBucket, string]> = [
  ["over30", "Over 30s"],
  ["s10to30", "10–30s"],
  ["under10", "Under 10s"],
];

export interface BucketTally {
  moves: number;
  blunders: number;
  mistakes: number;
}

export type GamePhase = "opening" | "middlegame" | "endgame";

/** The one-third rule's specialization options for the study third. */
export type StudyFocus = "Openings" | "Endgames" | "Positional Chess";

export const STUDY_FOCI: StudyFocus[] = [
  "Openings",
  "Endgames",
  "Positional Chess",
];

export interface PhaseSummary {
  recommendation: { focus: StudyFocus; reason: string } | null;
}

export interface StudyLogEntry {
  t: number;
  focus: StudyFocus;
  minutes: number;
}

/** Activity per third of the one-third rule, within the report window. */
export interface ThirdsActivity {
  drillAttempts: number;
  analyzedUrls: string[];
  studySessions: number;
  studyMinutes: number;
}

export interface RepertoireCheck {
  inRepertoire: boolean | null;
  note: string;
}

export interface GameAnalysis {
  game: CoachGame;
  issues: MoveIssue[];
  counts: Record<IssueSeverity, number>;
  acpl: number;
  repertoire: RepertoireCheck;
  clockBuckets?: Record<ClockBucket, BucketTally>;
  phaseTallies: Record<GamePhase, BucketTally>;
  lostOnTime: boolean;
  lostOnTimeWhileWinning: boolean;
  /** Eval after each position (start + one per ply), White POV, clamped. */
  evals: number[];
}

export interface Drill {
  id: string;
  gameUrl: string;
  opponent: string;
  fen: string;
  userColor: "w" | "b";
  playedSan: string;
  bestMoveSan: string;
  swing: number;
  evalBefore: number;
  moveNumber: number;
  /** True when this drill resurfaced because it was failed on a past visit. */
  isReview?: boolean;
}

export interface DrillRecord {
  drill: Drill;
  passed: boolean;
  fails: number;
  updatedAt: number;
}

export interface ResultTally {
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface OpeningSummary extends ResultTally {
  name: string;
  color: "w" | "b";
  inRepertoire: boolean | null;
}

export interface TimePressureSummary {
  buckets: Record<ClockBucket, BucketTally>;
  lostOnTime: number;
  lostOnTimeWhileWinning: number;
  hasClockData: boolean;
}

export interface RatingPoint {
  t: number;
  rating: number;
}

export interface DailyPoint {
  date: string;
  games: number;
  acpl: number;
  blunders: number;
}

/** One cell of the year-long activity heatmap. */
export interface DayActivity extends ResultTally {
  date: string;
}

export interface WeeklyReport {
  username: string;
  fromTime: number;
  toTime: number;
  /** Which time class this report is scoped to ("all" = every class). */
  timeClassFilter: string;
  totals: ResultTally;
  byTimeClass: Record<string, ResultTally>;
  games: GameAnalysis[];
  drills: Drill[];
  openings: OpeningSummary[];
  skippedGames: number;
  timePressure: TimePressureSummary;
  ratingSeries: RatingPoint[];
  /** Ratings are per-class on Chess.com — the series only ever charts one. */
  ratingSeriesClass: string | null;
  daily: DailyPoint[];
  phases: PhaseSummary;
  thirds: ThirdsActivity;
}
