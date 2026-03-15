/**
 * Browser-side Stockfish UCI wrapper.
 *
 * Loads stockfish-18-lite-single.js from /public/ as a Web Worker.
 * Serialises analysis calls so only one position is evaluated at a time.
 * Import this only from "use client" components.
 */

export interface EngineResult {
  /** Best move in UCI notation, e.g. "e2e4" */
  move: string;
  /** Centipawn score from the perspective of the side to move (positive = good) */
  cp: number;
}

const DEPTH = 8;
const TIMEOUT_MS = 8_000;

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;

/** Singleton worker, initialised once per page load. */
function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker("/stockfish-18-lite-single.js");
  }
  return worker;
}

/** Sends UCI init and waits for "readyok". */
function ensureInit(): Promise<void> {
  if (!initPromise) {
    const sf = ensureWorker();
    initPromise = new Promise<void>((resolve) => {
      const handler = (e: MessageEvent) => {
        if (typeof e.data === "string" && e.data === "readyok") {
          sf.removeEventListener("message", handler);
          resolve();
        }
      };
      sf.addEventListener("message", handler);
      sf.postMessage("uci");
      sf.postMessage("isready");
    });
  }
  return initPromise;
}

/**
 * Lock that serialises analysis calls — Promise chain where each call waits
 * for the previous one to finish before sending commands to the engine.
 */
let lock: Promise<void> = Promise.resolve();

/**
 * Evaluates a FEN position at depth 8 and returns the best move + centipawn score.
 * Returns null on timeout or if the worker is unavailable.
 */
export async function analyzePosition(fen: string): Promise<EngineResult | null> {
  const myTurn = lock.then(() => runAnalysis(fen));
  // Advance the lock even if this analysis fails
  lock = myTurn.then(
    () => {},
    () => {}
  );
  return myTurn;
}

async function runAnalysis(fen: string): Promise<EngineResult | null> {
  try {
    await ensureInit();
  } catch {
    return null;
  }

  const sf = ensureWorker();

  return new Promise<EngineResult | null>((resolve) => {
    let bestMove = "";
    let cp = 0;
    let settled = false;

    const finish = (result: EngineResult | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      sf.removeEventListener("message", handler);
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), TIMEOUT_MS);

    const handler = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line.includes("score cp")) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) cp = parseInt(m[1], 10);
        const pv = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/);
        if (pv) bestMove = pv[1];
      }
      if (line.startsWith("bestmove")) {
        const bm = line.match(/bestmove ([a-h][1-8][a-h][1-8]\w?)/);
        if (bm) bestMove = bm[1];
        finish(bestMove ? { move: bestMove, cp } : null);
      }
    };

    sf.addEventListener("message", handler);
    sf.postMessage("ucinewgame");
    sf.postMessage(`position fen ${fen}`);
    sf.postMessage(`go depth ${DEPTH}`);
  });
}

/** Terminates the worker. Call when analysis is fully done to free memory. */
export function terminateEngine() {
  if (worker) {
    worker.terminate();
    worker = null;
    initPromise = null;
    lock = Promise.resolve();
  }
}
