/**
 * Stockfish UCI wrapper for Node.js.
 *
 * Resolution order:
 *  1. System `stockfish` binary on PATH (fastest, most reliable)
 *  2. npm `stockfish` package – spawns via `node ./node_modules/stockfish/bin/stockfish-18-lite-single.js`
 *  3. Returns null if neither is available (puzzle extraction degrades gracefully)
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export interface EngineResult {
  /** Best move in UCI notation, e.g. "e2e4" */
  move: string;
  /** Centipawn score from the engine's perspective (positive = good for side to move) */
  cp: number;
}

let cachedCommand: string[] | null | undefined;

function getEngineCommand(): string[] | null {
  if (cachedCommand !== undefined) return cachedCommand;

  // 1. System binary (check known paths — do NOT trust bare "stockfish" on PATH
  //    because on Vercel serverless it doesn't exist and spawn will fail silently)
  const systemPaths = [
    "/opt/homebrew/bin/stockfish",
    "/usr/local/bin/stockfish",
    "/usr/bin/stockfish",
  ];
  for (const p of systemPaths) {
    if (existsSync(p)) {
      cachedCommand = [p];
      return cachedCommand;
    }
  }

  // 2. npm package — works on Vercel serverless via `node <path>`
  //    Try multiple base paths: process.cwd(), __dirname-relative, /var/task (Vercel)
  const sfFile = "node_modules/stockfish/bin/stockfish-18-lite-single.js";
  const candidates = [
    join(process.cwd(), sfFile),
    join(__dirname, "..", "..", sfFile),           // lib/jobs/../../node_modules
    join("/var/task", sfFile),                      // Vercel serverless
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      cachedCommand = ["node", c];
      console.log(`[stockfish] Using npm package: ${c}`);
      return cachedCommand;
    }
  }

  // 3. Last resort: try bare "stockfish" on PATH (local dev)
  cachedCommand = ["stockfish"];
  return cachedCommand;
}

const ANALYSIS_DEPTH = 12;
const ENGINE_TIMEOUT_MS = 10_000;

/**
 * Runs Stockfish at the given FEN and returns the best move + centipawn score.
 * Returns null if no engine is available or on timeout.
 */
let engineInitLogged = false;

export async function getBestMove(fen: string): Promise<EngineResult | null> {
  const cmd = getEngineCommand();
  if (!cmd) {
    if (!engineInitLogged) {
      console.warn("[stockfish] No engine found — checked system paths and npm package");
      engineInitLogged = true;
    }
    return null;
  }
  if (!engineInitLogged) {
    console.log(`[stockfish] Engine found: ${cmd.join(" ")}`);
    engineInitLogged = true;
  }

  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(cmd[0], cmd.slice(1), {
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch {
      resolve(null);
      return;
    }

    let bestMove = "";
    let cp = 0;
    let done = false;

    const finish = (result: EngineResult | null) => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        try {
          proc.kill();
        } catch {
          // ignore
        }
        resolve(result);
      }
    };

    const timeout = setTimeout(() => finish(null), ENGINE_TIMEOUT_MS);

    let buf = "";
    proc.stdout!.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        // Track the best centipawn score and pv move from info lines
        if (line.startsWith("info") && line.includes("score cp")) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          if (cpMatch) cp = parseInt(cpMatch[1], 10);
          const pvMatch = line.match(/\bpv ([a-h][1-8][a-h][1-8]\w?)/);
          if (pvMatch) bestMove = pvMatch[1];
        }
        if (line.startsWith("bestmove")) {
          const bmMatch = line.match(/bestmove ([a-h][1-8][a-h][1-8]\w?)/);
          if (bmMatch) bestMove = bmMatch[1];
          finish(bestMove ? { move: bestMove, cp } : null);
          return;
        }
      }
    });

    proc.on("error", () => finish(null));

    // Send UCI commands
    proc.stdin!.write("uci\n");
    proc.stdin!.write("isready\n");
    proc.stdin!.write(`position fen ${fen}\n`);
    proc.stdin!.write(`go depth ${ANALYSIS_DEPTH}\n`);
  });
}
