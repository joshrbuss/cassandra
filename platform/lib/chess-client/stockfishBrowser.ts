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
  /** Principal variation (space-separated UCI moves, 2-3 deep) */
  pv?: string;
}

const DEFAULT_DEPTH = 8;
const DEFAULT_TIMEOUT_MS = 8_000;

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
 * Evaluates a FEN position and returns the best move + centipawn score.
 * @param depth — search depth (default 8). Higher = slower but more accurate.
 * Returns null on timeout or if the worker is unavailable.
 */
export async function analyzePosition(fen: string, depth: number = DEFAULT_DEPTH): Promise<EngineResult | null> {
  const myTurn = lock.then(() => runAnalysis(fen, depth));
  // Advance the lock even if this analysis fails
  lock = myTurn.then(
    () => {},
    () => {}
  );
  return myTurn;
}

async function runAnalysis(fen: string, depth: number): Promise<EngineResult | null> {
  try {
    await ensureInit();
  } catch {
    return null;
  }

  const sf = ensureWorker();
  // Scale timeout with depth: ~1s per depth level, minimum 8s
  const timeoutMs = Math.max(DEFAULT_TIMEOUT_MS, depth * 1500);

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

    const timeout = setTimeout(() => finish(null), timeoutMs);

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
    sf.postMessage(`go depth ${depth}`);
  });
}

/**
 * Evaluates a FEN position with MultiPV and returns the top N moves + centipawn scores.
 * Returns an empty array on timeout or if the worker is unavailable.
 */
export async function analyzePositionMultiPV(
  fen: string,
  numLines: number = 3
): Promise<EngineResult[]> {
  const myTurn = lock.then(() => runMultiPVAnalysis(fen, numLines));
  lock = myTurn.then(
    () => {},
    () => {}
  );
  return myTurn;
}

async function runMultiPVAnalysis(
  fen: string,
  numLines: number
): Promise<EngineResult[]> {
  try {
    await ensureInit();
  } catch {
    return [];
  }

  const sf = ensureWorker();

  console.log(`[Stockfish MultiPV] Evaluating FEN: ${fen}`);
  console.log(`[Stockfish MultiPV] Side to move: ${fen.split(" ")[1] === "w" ? "white" : "black"}`);

  return new Promise<EngineResult[]>((resolve) => {
    const pvResults = new Map<number, EngineResult>();
    let settled = false;

    const finish = (results: EngineResult[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      sf.removeEventListener("message", handler);
      // Reset MultiPV back to 1 for other callers
      sf.postMessage("setoption name MultiPV value 1");
      console.log(`[Stockfish MultiPV] Results:`, results.map((r, i) => `PV${i+1}: ${r.move} (${r.cp}cp)`).join(", ") || "EMPTY");
      resolve(results);
    };

    const timeout = setTimeout(() => {
      console.warn(`[Stockfish MultiPV] Timeout after ${DEFAULT_TIMEOUT_MS}ms`);
      finish([]);
    }, DEFAULT_TIMEOUT_MS);

    const handler = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";

      // Parse "info depth D multipv N score cp X ... pv MOVE ..."
      // Also handle "score mate N" lines
      if (line.includes("multipv") && (line.includes("score cp") || line.includes("score mate"))) {
        const depthMatch = line.match(/depth (\d+)/);
        const d = depthMatch ? parseInt(depthMatch[1], 10) : 0;
        if (d < DEFAULT_DEPTH) return; // Only use final depth results

        const pvNum = line.match(/multipv (\d+)/);
        const moveMatch = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/);
        if (!pvNum || !moveMatch) return;

        let cp: number;
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) {
          cp = parseInt(cpMatch[1], 10);
        } else if (mateMatch) {
          // Encode mate as very large cp value (30000 = mate)
          const mateIn = parseInt(mateMatch[1], 10);
          cp = mateIn > 0 ? 30000 : -30000;
        } else {
          return;
        }

        console.log(`[Stockfish MultiPV] depth=${d} pv=${pvNum[1]} move=${moveMatch[1]} cp=${cp}`);
        pvResults.set(parseInt(pvNum[1], 10), {
          move: moveMatch[1],
          cp,
        });
      }

      if (line.startsWith("bestmove")) {
        const results: EngineResult[] = [];
        for (let i = 1; i <= numLines; i++) {
          const r = pvResults.get(i);
          if (r) results.push(r);
        }
        finish(results);
      }
    };

    sf.addEventListener("message", handler);
    sf.postMessage("ucinewgame");
    sf.postMessage(`setoption name MultiPV value ${numLines}`);
    sf.postMessage(`position fen ${fen}`);
    sf.postMessage(`go depth ${DEFAULT_DEPTH}`);
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
