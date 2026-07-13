import { and, eq, inArray, sql } from "drizzle-orm";
import type {
  Drill,
  DrillRecord,
  GameAnalysis,
  StudyFocus,
  StudyLogEntry,
} from "@/lib/coach/types";
import { db } from "./index";
import {
  analyzedGames,
  drillHistory,
  gameAnalyses,
  reportProgress,
  studyLog,
  users,
} from "./schema";

// Bump when the shape of a cached GameAnalysis changes (was in storage.ts).
const CACHE_VERSION = 4;

const toEpoch = (d: Date) => Math.floor(d.getTime() / 1000);
const fromEpoch = (s: number) => new Date(s * 1000);

/**
 * Resolve a Chess.com username to a users row, creating it on first sight.
 * Pre-auth this is our only identity; Phase 2 maps sessions onto these rows.
 */
export async function getOrCreateUserId(username: string): Promise<number> {
  const u = username.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.chesscomUsername, u))
    .limit(1);
  if (existing.length) return existing[0].id;

  const inserted = await db
    .insert(users)
    .values({ chesscomUsername: u })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (inserted.length) return inserted[0].id;

  // Lost an insert race — read the row the other writer created.
  const again = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.chesscomUsername, u))
    .limit(1);
  return again[0].id;
}

/** Look up a user without creating one — for read-only endpoints. */
export async function getUserId(username: string): Promise<number | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.chesscomUsername, username.toLowerCase()))
    .limit(1);
  return rows[0]?.id ?? null;
}

// ── Per-user report-build progress (replaces the globalThis singleton) ──────

export type ReportPhase = "idle" | "fetching" | "analyzing" | "done";
export interface Progress {
  phase: ReportPhase;
  current: number;
  total: number;
}

export async function getReportProgress(userId: number): Promise<Progress> {
  const rows = await db
    .select()
    .from(reportProgress)
    .where(eq(reportProgress.userId, userId))
    .limit(1);
  if (!rows.length) return { phase: "idle", current: 0, total: 0 };
  return {
    phase: rows[0].phase as ReportPhase,
    current: rows[0].current,
    total: rows[0].total,
  };
}

export async function setReportProgress(
  userId: number,
  update: Partial<Progress>,
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (update.phase !== undefined) set.phase = update.phase;
  if (update.current !== undefined) set.current = update.current;
  if (update.total !== undefined) set.total = update.total;
  await db
    .insert(reportProgress)
    .values({
      userId,
      phase: update.phase ?? "idle",
      current: update.current ?? 0,
      total: update.total ?? 0,
    })
    .onConflictDoUpdate({ target: reportProgress.userId, set });
}

// ── Shared analysis cache (not user-scoped) ────────────────────────────────

export async function loadAnalyses(
  urls: string[],
  depth: number,
): Promise<Record<string, GameAnalysis>> {
  if (urls.length === 0) return {};
  const rows = await db
    .select({ url: gameAnalyses.url, analysis: gameAnalyses.analysis })
    .from(gameAnalyses)
    .where(
      and(
        inArray(gameAnalyses.url, urls),
        eq(gameAnalyses.depth, depth),
        eq(gameAnalyses.cacheVersion, CACHE_VERSION),
      ),
    );
  const map: Record<string, GameAnalysis> = {};
  for (const r of rows) map[r.url] = r.analysis;
  return map;
}

export async function saveAnalysis(
  url: string,
  depth: number,
  analysis: GameAnalysis,
): Promise<void> {
  await db
    .insert(gameAnalyses)
    .values({ url, depth, cacheVersion: CACHE_VERSION, analysis })
    .onConflictDoUpdate({
      target: [gameAnalyses.url, gameAnalyses.depth, gameAnalyses.cacheVersion],
      set: { analysis },
    });
}

// ── Per-user drill history ─────────────────────────────────────────────────

export async function loadDrillHistory(
  userId: number,
): Promise<Record<string, DrillRecord>> {
  const rows = await db
    .select()
    .from(drillHistory)
    .where(eq(drillHistory.userId, userId));
  const map: Record<string, DrillRecord> = {};
  for (const r of rows) {
    map[r.drillId] = {
      drill: r.drill as Drill,
      passed: r.passed,
      fails: r.fails,
      updatedAt: toEpoch(r.updatedAt),
    };
  }
  return map;
}

/**
 * Record a drill attempt. The fail counter increments in SQL rather than
 * being read-modify-written by the caller, so concurrent submissions for
 * the same drill can't lose an update.
 */
export async function upsertDrillRecord(
  userId: number,
  drill: Drill,
  passed: boolean,
  updatedAt: number,
): Promise<void> {
  const failDelta = passed ? 0 : 1;
  await db
    .insert(drillHistory)
    .values({
      userId,
      drillId: drill.id,
      drill,
      passed,
      fails: failDelta,
      updatedAt: fromEpoch(updatedAt),
    })
    .onConflictDoUpdate({
      target: [drillHistory.userId, drillHistory.drillId],
      set: {
        drill,
        passed,
        fails: sql`${drillHistory.fails} + ${failDelta}`,
        updatedAt: fromEpoch(updatedAt),
      },
    });
}

// ── Per-user "really analyzed" marks ───────────────────────────────────────

export async function loadAnalyzedGames(
  userId: number,
): Promise<Record<string, number>> {
  const rows = await db
    .select()
    .from(analyzedGames)
    .where(eq(analyzedGames.userId, userId));
  const map: Record<string, number> = {};
  for (const r of rows) map[r.url] = toEpoch(r.analyzedAt);
  return map;
}

export async function markAnalyzed(userId: number, url: string): Promise<void> {
  await db
    .insert(analyzedGames)
    .values({ userId, url })
    .onConflictDoNothing();
}

// ── Per-user study log ─────────────────────────────────────────────────────

export async function loadStudyLog(userId: number): Promise<StudyLogEntry[]> {
  const rows = await db
    .select()
    .from(studyLog)
    .where(eq(studyLog.userId, userId))
    .orderBy(studyLog.occurredAt);
  return rows.map((r) => ({
    t: toEpoch(r.occurredAt),
    focus: r.focus as StudyFocus,
    minutes: r.minutes,
  }));
}

export async function addStudySession(
  userId: number,
  focus: StudyFocus,
  minutes: number,
): Promise<void> {
  await db.insert(studyLog).values({ userId, focus, minutes });
}
