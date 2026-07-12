import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { GameAnalysis } from "@/lib/coach/types";

/**
 * Phase 1 identity model — pragmatic, multi-user-*ready*, pre-auth.
 *
 * There's no login yet, so the only identity we have is the Chess.com username
 * being tracked. Each tracked username gets one `users` row, and all per-user
 * data FKs to it. This gives real per-username data isolation today, and when
 * auth lands (Phase 2) the accounts layer maps a session → a users row (or a
 * users row gains an owning-account id) without moving any data.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Stored lowercased; the app treats usernames case-insensitively.
  chesscomUsername: text("chesscom_username").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Stockfish output cache. Deliberately NOT scoped to a user — a given game at a
 * given depth analyzes to the same result for everyone, so this is a shared
 * cache (the Phase 3 "analyzed once, free for everyone" property, for free).
 * Keyed to match the old cacheKey: url + depth + cache version.
 */
export const gameAnalyses = pgTable(
  "game_analyses",
  {
    url: text("url").notNull(),
    depth: integer("depth").notNull(),
    cacheVersion: integer("cache_version").notNull(),
    analysis: jsonb("analysis").$type<GameAnalysis>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.url, t.depth, t.cacheVersion] })],
);

/** Per-user drill progress (was drill-history.json). */
export const drillHistory = pgTable(
  "drill_history",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    drillId: text("drill_id").notNull(),
    drill: jsonb("drill").notNull(),
    passed: boolean("passed").notNull(),
    fails: integer("fails").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.drillId] })],
);

/** Per-user "really analyzed in replay" marks (was analyzed-games.json). */
export const analyzedGames = pgTable(
  "analyzed_games",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.url] })],
);

/** Per-user study sessions (was study-log.json). */
export const studyLog = pgTable("study_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  focus: text("focus").notNull(),
  minutes: integer("minutes").notNull(),
});

/**
 * Per-user report-build progress, replacing the process-global singleton in
 * lib/coach/progress.ts (which shared one state across every request).
 */
export const reportProgress = pgTable("report_progress", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phase: text("phase").notNull(),
  current: integer("current").notNull().default(0),
  total: integer("total").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
