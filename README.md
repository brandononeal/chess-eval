# Chess Eval

A minimal chess position evaluator with real-time Stockfish analysis.

## Features

- Interactive chessboard with drag-and-drop
- Real-time Stockfish evaluation bar

## Tech Stack

- [Next.js 14](https://nextjs.org/) / [React 18](https://react.dev/)
- [chess.js](https://github.com/jhlywa/chess.js) — move validation
- [react-chessboard](https://www.npmjs.com/package/react-chessboard) — board UI
- [Stockfish.js](https://www.npmjs.com/package/stockfish.js) — WASM engine
- [Tailwind CSS](https://tailwindcss.com/) — styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                  # Home page
  components/
    ChessBoard.tsx          # Interactive board (ResizeObserver + react-chessboard)
    Analysis.tsx             # Connects Stockfish to the evaluation bar
    EvaluationBar.tsx        # Visual score indicator
lib/
  chess-utils.ts            # Move validation helpers
  stockfish.ts              # Stockfish engine wrapper
```

## Roadmap

- [x] Interactive board
- [x] Real-time evaluation bar
- [ ] Stockfish WASM integration
- [ ] FEN import/export
- [ ] Best moves and principal variations
- [ ] Multiplayer mode with real-time evaluation
