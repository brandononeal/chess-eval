# Roadmap

## Positioning

A personal chess-training dashboard — pull your Chess.com games, analyze them
with Stockfish, drill your own mistakes, track weekly progress.

- **Purpose: personal.** Built for me first.
- **Architecture: multi-user-ready.** Cheap choices now (a `user_id` on every
  table, per-user isolation) keep the door open without a rewrite later.
- **Distribution: not a paid product — for now.** The "analyze my games and
  coach me" space is crowded with free incumbents (Chess.com Insights, Lichess,
  Aimchess), so the goals are a personal tool and a portfolio piece, not a
  business bet.

**Guiding principle:** scalable, not overengineered. Make the cheap choices that
keep multi-user possible; don't build public-scale infrastructure until it's
earned.

## Current state

- Next.js 15 / React 19.
- Two engines: native Stockfish (server, `child_process`) for batch game
  analysis; WASM Stockfish (browser) for the `/board` explorer.
- Data persisted in Postgres via Drizzle.
- Chess.com public API for game history (no key required).
- All API routes validate/sanitize input; cross-origin writes are CSRF-blocked.

## Phase 1 — Persistence + friendlier user selection _(nearly done)_

- [x] In-app Chess.com username picker (remembered in `localStorage`), replacing
      the `.env.local` / `?username=` mechanism.
- [x] API input validation + sanitization; CSRF middleware on mutations.
- [x] Postgres + Drizzle: schema, migration, and a data-access layer
      (`lib/db/queries.ts`) replacing `lib/coach/storage.ts`.
- [x] Multi-user-ready schema: a `users` table and a `user_id` FK on every
      per-user table; `game_analyses` is a shared cache.
- [x] Existing `./data` JSON migrated into Postgres (`scripts/import-json.mjs`).
- [ ] Replace the `globalThis` progress singleton with the per-user
      `report_progress` row (table exists, not yet wired).

## Phase 2 — Accounts & auth

- [ ] **Auth.js (NextAuth)**: OAuth (Google/GitHub) or email magic links; CSRF
      handled for you.
- [ ] Wire the session to the `user_id` the schema already carries → per-user
      data isolation with essentially no schema change.
- [ ] Each account binds its own Chess.com username.

## Phase 3 — Deploy + engine scaling

Hosting is gated by the native-Stockfish constraint:

- **Path A — serverless (e.g. Vercel):** requires moving batch analysis to the
  browser WASM engine; native Stockfish can't run serverless.
- **Path B — persistent / self-hosted server:** native Stockfish works
  unchanged; just add the DB. **Recommended default.**
- **Path C — serverless web + job queue + dedicated analysis worker:** the
  scale-out target only if this goes public and multi-user.

- [ ] Deploy (Path B) behind a reverse proxy with TLS.
- [ ] Move analysis to a background job (jobs table + worker), decoupling slow
      Stockfish runs from the HTTP request; surface per-job progress.
- [ ] Make the analysis cache a shared table — a game analyzed once is then free
      for everyone.
- [ ] Per-user rate-limiting on Chess.com fetches.

## Phase 4 — Monetization _(only if it earns it)_

- Usage tiers / billing, onboarding polish, monitoring. Deliberately last.

## Open decisions

- **DB + query layer:** resolved — **Postgres + Drizzle** (local Docker or
  Homebrew for dev; a hosted or self-hosted instance later).
- **Engine strategy:** keep native Stockfish + a persistent-server deploy
  (Path B); the client-WASM engine stays a fallback for a serverless future.
