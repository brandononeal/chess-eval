# Chess Eval

A minimal chess position evaluator with real-time Stockfish analysis

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
