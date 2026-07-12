import { and, eq, inArray } from "drizzle-orm";
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

export async function getDrillFails(
  userId: number,
  drillId: string,
): Promise<number> {
  const rows = await db
    .select({ fails: drillHistory.fails })
    .from(drillHistory)
    .where(and(eq(drillHistory.userId, userId), eq(drillHistory.drillId, drillId)))
    .limit(1);
  return rows[0]?.fails ?? 0;
}

export async function upsertDrillRecord(
  userId: number,
  record: DrillRecord,
): Promise<void> {
  const values = {
    userId,
    drillId: record.drill.id,
    drill: record.drill,
    passed: record.passed,
    fails: record.fails,
    updatedAt: fromEpoch(record.updatedAt),
  };
  await db
    .insert(drillHistory)
    .values(values)
    .onConflictDoUpdate({
      target: [drillHistory.userId, drillHistory.drillId],
      set: {
        drill: values.drill,
        passed: values.passed,
        fails: values.fails,
        updatedAt: values.updatedAt,
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
