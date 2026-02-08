import { StockfishEngine } from "@/lib/stockfish";

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private messageQueue: string[] = [];

  postMessage(msg: string) {
    this.messageQueue.push(msg);

    if (msg === "uci") {
      setTimeout(() => this.simulateMessage("uciok"), 0);
    } else if (msg === "isready") {
      setTimeout(() => this.simulateMessage("readyok"), 0);
    } else if (msg.startsWith("go depth")) {
      setTimeout(() => {
        this.simulateMessage(
          "info depth 10 multipv 1 score cp 30 pv e2e4 e7e5",
        );
        this.simulateMessage(
          "info depth 10 multipv 2 score cp 20 pv d2d4 d7d5",
        );
        this.simulateMessage("bestmove e2e4");
      }, 0);
    }
  }

  terminate() {}

  private simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

beforeEach(() => {
  (global as any).Worker = jest.fn(() => new MockWorker());
});

afterEach(() => {
  delete (global as any).Worker;
});

describe("StockfishEngine", () => {
  it("initializes and signals readyok", (done) => {
    const engine = new StockfishEngine();

    engine.onReady(() => {
      expect(engine.isReady()).toBe(true);
      engine.destroy();
      done();
    });

    engine.init(3);
  });

  it("is not ready before init completes", () => {
    const engine = new StockfishEngine();
    expect(engine.isReady()).toBe(false);
  });

  it("delivers analysis lines via onInfo callback", (done) => {
    const engine = new StockfishEngine();
    let called = false;

    engine.onReady(() => {
      engine.analyze(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        10,
      );
    });

    engine.onInfo((lines, depth) => {
      if (called) return;
      called = true;
      expect(lines.length).toBeGreaterThan(0);
      expect(depth).toBe(10);
      const first = lines[0];
      expect(first.score.type).toBe("cp");
      expect(first.pv.length).toBeGreaterThan(0);
      engine.destroy();
      done();
    });

    engine.init(3);
  });

  it("delivers bestMove via onBestMove callback", (done) => {
    const engine = new StockfishEngine();

    engine.onReady(() => {
      engine.analyze(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        10,
      );
    });

    engine.onBestMove((move) => {
      expect(move).toBe("e2e4");
      engine.destroy();
      done();
    });

    engine.init(3);
  });

  it("inverts score when black to move", (done) => {
    const engine = new StockfishEngine();
    let called = false;

    engine.onReady(() => {
      engine.analyze(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        10,
      );
    });

    engine.onInfo((lines) => {
      if (called) return;
      called = true;
      const first = lines[0];
      expect(first.score.type).toBe("cp");
      expect(first.score.value).toBeLessThan(0);
      engine.destroy();
      done();
    });

    engine.init(3);
  });

  it("calls onError when worker creation fails", () => {
    (global as any).Worker = jest.fn(() => {
      throw new Error("Worker not supported");
    });

    const engine = new StockfishEngine();
    const errorCb = jest.fn();
    engine.onError(errorCb);
    engine.init(3);

    expect(errorCb).toHaveBeenCalledWith(
      expect.stringContaining("Failed to create Stockfish worker"),
    );
  });

  it("can be destroyed cleanly", (done) => {
    const engine = new StockfishEngine();

    engine.onReady(() => {
      engine.destroy();
      expect(engine.isReady()).toBe(false);
      done();
    });

    engine.init(3);
  });
});
