# Chess Coach

A weekly chess training dashboard built around the **one-third rule** — split practice across **Tactics**, **Play & Analyze**, and **Study**. It pulls your games from the Chess.com API, batch-analyzes them with native Stockfish, and turns the results into coaching:

- **Tactics** — your own worst moves become find-the-better-move drills; near-best alternatives are accepted (verified by the engine), and failed drills resurface until you pass them
- **Play & Analyze** — W-L-D record, rating trend, a year-long activity heatmap, per-day ACPL and blunder counts, and blunder rate by time remaining (parsed from PGN `%clk` tags). A game only counts as "analyzed" once you step through it in the replay.
- **Study** — win rates by opening family checked against a personal repertoire, a recommendation for the weakest phase of your game (opening / middlegame / endgame), and one-tap study-session logging

Every game is analyzed once and cached in Postgres, so repeat reports are cheap.

## Board

The original position evaluator lives at `/board`: drag-and-drop board with real-time Stockfish 17 WASM evaluation, eval bar, move history, and material balance.

<img width="544" height="564" alt="Board screenshot" src="https://github.com/user-attachments/assets/93eae8c8-5a50-4878-91cd-b31e63f789da" />

## Tech Stack

- [Next.js 15](https://nextjs.org/) / [React 19](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) — persistence
- [chess.js](https://github.com/jhlywa/chess.js) — move validation & game state
- [react-chessboard](https://www.npmjs.com/package/react-chessboard) — board UI
- [Stockfish](https://stockfishchess.org/) — native binary for batch analysis (`brew install stockfish`), WASM build for in-browser eval
- [Tailwind CSS](https://tailwindcss.com/) — styling

## Getting Started

Requires Node, the native Stockfish binary, and a running Postgres.

```bash
brew install stockfish            # native engine for batch analysis
npm install

# Start Postgres — either Docker:
docker compose up -d              # uses docker-compose.yml (db: chess_eval)
# ...or Homebrew:
#   brew install postgresql@16 && brew services start postgresql@16
#   createuser chess && createdb -O chess chess_eval

cp .env.example .env.local        # set CHESS_USERNAME and DATABASE_URL
npm run db:migrate                # apply the schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Your Chess.com username comes from the in-app **Player** field (remembered in your browser), falling back to the `CHESS_USERNAME` default in `.env.local`. Browse the database with `npm run db:studio`.

## Testing

`npm test` runs the full suite, including DB integration tests — Jest auto-creates and migrates a dedicated `chess_eval_test` database on the same local Postgres (never your dev data; override with `TEST_DATABASE_URL`, which must name a `*_test` database).
Run just the DB tests with `npm run test:db`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together, and [ROADMAP.md](ROADMAP.md) for what's next.
