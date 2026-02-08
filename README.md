# Chess Eval

A minimal chess position evaluator with real-time Stockfish analysis

<img width="544" height="564" alt="Screenshot 2026-02-07 at 9 03 00 PM" src="https://github.com/user-attachments/assets/93eae8c8-5a50-4878-91cd-b31e63f789da" />

## Features

- Interactive chessboard with drag-and-drop
- Real-time Stockfish 17 WASM evaluation
- Animated evaluation bar with mate-in-N, checkmate, and draw
- Move history with back/forward navigation, board flip
- Material balance display
- DarkReader compatible

## Tech Stack

- [Next.js 15](https://nextjs.org/) / [React 19](https://react.dev/)
- [chess.js](https://github.com/jhlywa/chess.js) — move validation & game state
- [react-chessboard](https://www.npmjs.com/package/react-chessboard) — board UI
- [Stockfish 17](https://www.npmjs.com/package/stockfish) — WASM engine
- [Tailwind CSS](https://tailwindcss.com/) — styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
