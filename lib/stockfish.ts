export interface Score {
  type: "cp" | "mate";
  value: number;
}

export interface PVLine {
  multipv: number;
  depth: number;
  score: Score;
  pv: string[];
}

export interface AnalysisResult {
  lines: PVLine[];
  bestMove: string;
  currentDepth: number;
}

type InfoCallback = (lines: PVLine[], depth: number) => void;
type BestMoveCallback = (move: string) => void;
type ReadyCallback = () => void;
type ErrorCallback = (error: string) => void;

const ENGINE_PATH = "/stockfish-17.1-lite-single-03e3232.js";

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private initializing = false;
  private lines: Map<number, PVLine> = new Map();
  private currentDepth = 0;
  private blackToMove = false;
  private searchActive = false;
  private awaitingReadyForAnalyze = false;
  private pendingFen: string | null = null;
  private pendingDepth: number | null = null;

  private onInfoCb: InfoCallback | null = null;
  private onBestMoveCb: BestMoveCallback | null = null;
  private onReadyCb: ReadyCallback | null = null;
  private onErrorCb: ErrorCallback | null = null;

  onInfo(cb: InfoCallback) {
    this.onInfoCb = cb;
  }
  onBestMove(cb: BestMoveCallback) {
    this.onBestMoveCb = cb;
  }
  onReady(cb: ReadyCallback) {
    this.onReadyCb = cb;
  }
  onError(cb: ErrorCallback) {
    this.onErrorCb = cb;
  }

  isReady() {
    return this.ready;
  }

  init(multiPV = 3): void {
    if (typeof window === "undefined") return;
    if (this.worker || this.initializing) return;

    this.initializing = true;

    try {
      this.worker = new Worker(ENGINE_PATH);
    } catch (err) {
      this.initializing = false;
      this.onErrorCb?.(`Failed to create Stockfish worker: ${err}`);
      return;
    }

    this.worker.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);
      this.handleMessage(line, multiPV);
    };

    this.worker.onerror = (e) => {
      this.onErrorCb?.(`Stockfish worker error: ${e.message}`);
    };

    this.send("uci");
  }

  private handleMessage(line: string, multiPV: number): void {
    if (line === "uciok") {
      this.send(`setoption name MultiPV value ${multiPV}`);
      this.send("setoption name Threads value 1");
      this.send("setoption name Hash value 16");
      this.send("isready");
    } else if (line === "readyok") {
      if (!this.ready) {
        this.ready = true;
        this.initializing = false;
        this.onReadyCb?.();
      }
      if (
        this.awaitingReadyForAnalyze &&
        this.pendingFen &&
        this.pendingDepth
      ) {
        const fen = this.pendingFen;
        const depth = this.pendingDepth;
        this.awaitingReadyForAnalyze = false;
        this.pendingFen = null;
        this.pendingDepth = null;
        this.startSearch(fen, depth);
      }
    } else if (line.startsWith("info depth")) {
      this.parseInfo(line);
    } else if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const move = parts[1] ?? "";
      this.searchActive = false;
      this.onBestMoveCb?.(move);
    }
  }

  private parseInfo(line: string): void {
    if (!this.searchActive) return;
    if (!line.includes(" score ")) return;
    if (line.includes(" upperbound") || line.includes(" lowerbound")) return;

    const tokens = line.split(" ");

    let depth = 0;
    let score: Score = { type: "cp", value: 0 };
    let pv: string[] = [];
    let multipv = 1;

    for (let i = 0; i < tokens.length; i++) {
      switch (tokens[i]) {
        case "depth":
          depth = parseInt(tokens[i + 1], 10);
          break;
        case "multipv":
          multipv = parseInt(tokens[i + 1], 10);
          break;
        case "score":
          if (tokens[i + 1] === "cp") {
            score = { type: "cp", value: parseInt(tokens[i + 2], 10) };
          } else if (tokens[i + 1] === "mate") {
            score = { type: "mate", value: parseInt(tokens[i + 2], 10) };
          }
          break;
        case "pv":
          pv = tokens.slice(i + 1);
          i = tokens.length;
          break;
      }
    }

    if (depth === 0) return;

    if (this.blackToMove) {
      score = { type: score.type, value: -score.value };
    }

    const pvLine: PVLine = { multipv, depth, score, pv };
    this.lines.set(multipv, pvLine);
    this.currentDepth = depth;

    const sortedLines = Array.from(this.lines.values()).sort(
      (a, b) => a.multipv - b.multipv,
    );
    this.onInfoCb?.(sortedLines, depth);
  }

  analyze(fen: string, depth: number = 20): void {
    if (!this.worker) return;
    this.pendingFen = fen;
    this.pendingDepth = depth;
    this.awaitingReadyForAnalyze = true;
    this.searchActive = false;
    this.send("stop");
    this.send("isready");
  }

  private startSearch(fen: string, depth: number): void {
    this.lines.clear();
    this.currentDepth = 0;
    this.blackToMove = fen.split(" ")[1] === "b";
    this.searchActive = true;
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  stop(): void {
    if (!this.worker) return;
    this.send("stop");
  }

  destroy(): void {
    if (this.worker) {
      this.send("quit");
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.initializing = false;
    this.lines.clear();
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }
}
