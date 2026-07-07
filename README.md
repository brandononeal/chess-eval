# Chess Coach

A weekly chess training dashboard built around the loop **Play → Analyze → Openings → Puzzles**. Pulls games from the Chess.com API, batch-analyzes them with native Stockfish, and turns the results into coaching:

- **Play** — W-L-D record, rating trend, per-day ACPL and blunder counts, and blunder rate by time remaining (parsed from PGN `%clk` tags)
- **Analyze** — every game scored move by move; inaccuracies, mistakes, and blunders open on an interactive board with live engine eval
- **Openings** — win rates by opening family, checked against a personal repertoire
- **Puzzles** — your own worst moves become find-the-better-move drills; near-best alternatives are accepted (verified by the engine), and failed drills resurface until you pass them

Analysis results are cached in `data/` so each game is only analyzed once.

## Board

The original position evaluator lives at `/board`: drag-and-drop board with real-time Stockfish 17 WASM evaluation, eval bar, move history, and material balance.

<img width="544" height="564" alt="Screenshot 2026-02-07 at 9 03 00 PM" src="https://github.com/user-attachments/assets/93eae8c8-5a50-4878-91cd-b31e63f789da" />

## Tech Stack

- [Next.js 15](https://nextjs.org/) / [React 19](https://react.dev/)
- [chess.js](https://github.com/jhlywa/chess.js) — move validation & game state
- [react-chessboard](https://www.npmjs.com/package/react-chessboard) — board UI
- [Stockfish](https://stockfishchess.org/) — native binary for batch analysis (`brew install stockfish`), WASM build for in-browser eval
- [Tailwind CSS](https://tailwindcss.com/) — styling

## Getting Started

```bash
brew install stockfish            # native engine for batch analysis
cp .env.example .env.local        # set your Chess.com username
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Chess.com username comes from `CHESS_USERNAME` in `.env.local`; override per-request with `?username=` on `/api/coach/report`.
