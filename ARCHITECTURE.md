# Architecture

A single Next.js app that fetches a player's Chess.com games, analyzes them with
Stockfish, and renders coaching. This is the map of how the pieces fit.

## Layers

```
app/                    UI (React) + API route handlers
  api/coach/*           REST-ish endpoints (report, activity, drill-result,
                        analyzed, study-log, verify-move, progress)
  components/           dashboard, board, replay, drills, charts
lib/coach/              domain logic — no framework, no I/O
  analyze.ts            game → GameAnalysis (issues, tallies, evals)
  grade.ts              report → letter grade + next-level plan
  chesscom.ts           Chess.com API client (archive fetch + parse)
  repertoire.ts         opening classification vs a fixed repertoire
  engine.ts             native Stockfish (child_process) UCI wrapper
  validation.ts         input sanitizers shared by the routes
lib/db/                 persistence
  schema.ts             Drizzle table definitions
  queries.ts            data-access layer (the only module that touches db)
  index.ts              postgres-js pool + drizzle client
middleware.ts           CSRF guard (blocks cross-origin writes to /api/coach)
```

The domain layer (`lib/coach`) is deliberately pure and framework-free — it's
where the tests live, and it has no knowledge of HTTP or the database.

## The report flow (the heavy path)

`GET /api/coach/report` is where most of the work happens:

1. Fetch the player's recent games from Chess.com (`fetchGamesSince`), filtering
   on cheap fields before the expensive PGN parse; month archives are cached
   in-process.
2. Resolve the player to a `users` row (`getOrCreateUserId`).
3. Look up already-analyzed games in the **shared** `game_analyses` cache.
4. For cache misses, spawn native Stockfish and analyze each game, writing the
   result back to the cache.
5. Load the player's per-user drill history, analyzed-game marks, and study log,
   then `buildReport` assembles everything into the response.

Mutations (`drill-result`, `analyzed`, `study-log`) are small: validate input,
resolve the user, upsert one row.

## Data model

- `users` — one row per tracked Chess.com username (the only identity pre-auth).
- `game_analyses` — Stockfish output keyed by `(url, depth, cache_version)`.
  **Not** user-scoped: a game analyzes identically for everyone, so this is a
  shared cache — analyze once, free for all users thereafter.
- `drill_history`, `analyzed_games`, `study_log` — per-user, FK to `users` with
  cascade delete.
- `report_progress` — per-user progress for the long report build.

Every per-user table carries `user_id` even though there's one user today, so
adding real accounts (see roadmap Phase 2) is additive, not a migration.

## Two Stockfish engines

- **Server, native** (`lib/coach/engine.ts`): `child_process`-spawned binary for
  batch game analysis. Fast, but requires a persistent host — it cannot run on
  serverless platforms.
- **Client, WASM** (`lib/stockfish.ts` + a Web Worker): powers the `/board`
  explorer's live eval in the browser.

## Security

- All API input is validated/sanitized (`lib/coach/validation.ts`). Notably,
  `sanitizeDrill` rebuilds a drill from a field allowlist and rejects any
  non-`chess.com` URL, closing a stored-XSS path.
- `middleware.ts` blocks cross-origin writes to `/api/coach/*` (CSRF).

## Known constraints / tradeoffs

Honest about where the edges are:

- **Analysis is synchronous per request.** The report route blocks while
  Stockfish runs (up to ~50 games), which is fine for single-user localhost but
  is the piece that must move to a background job before multi-user load or a
  timeout-bound deploy (roadmap Phase 3).
- **Report progress is a process-global singleton** (`lib/coach/progress.ts`),
  not yet the per-user `report_progress` table — a known follow-up.
- **No auth yet.** Identity is the Chess.com username; real accounts are Phase 2.
- **In-process caches** (Chess.com month archives) don't share across scaled
  instances — a scale-out consideration, not a current issue.
