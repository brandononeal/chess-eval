import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { Chess } from "chess.js";

// Server-side UCI wrapper around the native Stockfish binary (much faster
// than the WASM build for batch analysis). Path override: STOCKFISH_PATH.

const STOCKFISH_PATHS = [
  process.env.STOCKFISH_PATH,
  "stockfish",
  "/opt/homebrew/bin/stockfish",
  "/usr/local/bin/stockfish",
].filter(Boolean) as string[];

const MATE_CP = 10_000;

export interface Evaluation {
  cp: number; // White's perspective; mates mapped to ±(MATE_CP - pliesToMate)
  bestMoveUci: string;
}

// spawn() reports a missing binary asynchronously via the 'error' event,
// never as a synchronous throw — so candidates must be raced, not try/caught.
function trySpawn(path: string): Promise<ChildProcessWithoutNullStreams | null> {
  return new Promise((resolve) => {
    const proc = spawn(path);
    proc.once("spawn", () => resolve(proc));
    proc.once("error", () => resolve(null));
  });
}

export class NativeEngine {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private pending: ((line: string) => boolean) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;

  async init(): Promise<void> {
    for (const path of STOCKFISH_PATHS) {
      this.proc = await trySpawn(path);
      if (this.proc) break;
    }
    if (!this.proc) {
      throw new Error(
        `stockfish not found (tried ${STOCKFISH_PATHS.join(", ")}) — brew install stockfish`,
      );
    }

    const fail = (reason: string) => {
      this.proc = null;
      this.pending = null;
      this.pendingReject?.(new Error(reason));
      this.pendingReject = null;
    };
    this.proc.on("error", (err) => fail(`stockfish error: ${err.message}`));
    this.proc.on("exit", (code) => {
      if (this.pendingReject) fail(`stockfish exited with code ${code}`);
    });

    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (this.pending && this.pending(line.trim())) {
          this.pending = null;
          this.pendingReject = null;
        }
      }
    });

    this.send("uci");
    await this.waitFor((line) => line === "uciok");
    this.send("setoption name Threads value 4");
    this.send("setoption name Hash value 128");
    this.send("isready");
    await this.waitFor((line) => line === "readyok");
  }

  private send(cmd: string): void {
    if (!this.proc) throw new Error("engine not running");
    this.proc.stdin.write(cmd + "\n");
  }

  private waitFor(match: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pendingReject = reject;
      this.pending = (line) => {
        if (match(line)) {
          resolve();
          return true;
        }
        return false;
      };
    });
  }

  async evaluate(fen: string, depth: number): Promise<Evaluation> {
    let lastScore = 0;
    let bestMoveUci = "";
    const whiteToMove = fen.split(" ")[1] === "w";

    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);

    await this.waitFor((line) => {
      if (line.startsWith("info ") && line.includes(" score ")) {
        const cpMatch = line.match(/ score cp (-?\d+)/);
        const mateMatch = line.match(/ score mate (-?\d+)/);
        if (cpMatch) {
          lastScore = parseInt(cpMatch[1], 10);
        } else if (mateMatch) {
          const n = parseInt(mateMatch[1], 10);
          lastScore = n > 0 ? MATE_CP - n : -MATE_CP - n;
        }
      }
      if (line.startsWith("bestmove")) {
        bestMoveUci = line.split(" ")[1] ?? "";
        return true;
      }
      return false;
    });

    // UCI scores are from the side to move; normalize to White's perspective.
    return { cp: whiteToMove ? lastScore : -lastScore, bestMoveUci };
  }

  quit(): void {
    if (this.proc) {
      this.proc.stdin.write("quit\n");
      this.proc = null;
    }
  }
}

export function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return "";
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return move?.san ?? "";
  } catch {
    return "";
  }
}
