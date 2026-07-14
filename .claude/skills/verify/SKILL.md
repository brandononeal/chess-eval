---
name: verify
description: Build, launch, and drive chess-eval to verify a change end-to-end.
---

# Verifying chess-eval changes

## Prereqs

- Postgres must be listening on 5432 (`pg_isready -h localhost -p 5432`).
  Usually already running (docker-compose `db` service or Homebrew).
- No API keys needed; Chess.com public API + local Stockfish.

## Launch

```bash
npm run dev   # Next.js on http://localhost:3000, ready in ~2s
```

## Drive

- The dashboard is `/` (client component; grade/report render after a
  fetch to `/api/coach/report`). Allow a few seconds — first build of a
  report runs Stockfish per game, but analyses are cached in Postgres,
  so subsequent loads are fast.
- Sanity-check data exists before browser work:
  `curl "http://localhost:3000/api/coach/report?days=7&tc=all"`
  (default username comes from CHESS_USERNAME in .env.local).
- Useful surfaces: `/` (report + grade + drills + games), `/board`
  (WASM engine explorer). Range (7d/30d/90d) and time-class filters
  re-fetch the report.
- Browser-drive via the Chrome MCP tools; the header (grade, note,
  breakdown, plan) is the top ~450px of the page.

## Gotchas

- `curl` of `/` proves the server is up but shows no report content
  (client-rendered) — use the API route or a real browser.
- Domain logic lives in `lib/coach/*` (pure); its jest tests are CI's
  job, not verification.
